/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerSortShorthand } from '@elastic/esql';
import {
  type Feature,
  type KnowledgeIndicator,
  type QueryLink,
  type SignificantEventsTuningConfig,
  type StreamQuery,
  DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
} from '@kbn/significant-events-schema';
import type { SearchMode } from '../../../../common/queries';
import type { KnowledgeIndicatorType } from '../fields';
import {
  type KIBulkOperation,
  type KnowledgeIndicatorClientDeps,
  type KnowledgeIndicatorDataStreamClient,
  type RuleUnbackedFilter,
} from './types';
import { RevisionReader } from './revision_reader';
import { IndicatorWriter } from './indicator_writer';
import { IndicatorReader } from './indicator_reader';
import { IndicatorSearcher } from './indicator_searcher';
import { QueryRuleOrchestrator, type PromoteQueriesResult } from './query_rule_orchestrator';
import { computeExpiresAt } from './serializers';
import type { SignificantEventsAlertingContext } from '../../significant_events/alerting/significant_events_alerting_context';

export type {
  KIBulkOperation,
  KnowledgeIndicatorClientDeps,
  KnowledgeIndicatorDataStreamClient,
  RuleUnbackedFilter,
};

/**
 * Space-scoped access to knowledge indicators keyed by Nightshift source id.
 *
 * A source id identifies the unit of data a KI describes. Today it is the
 * stream name: every caller passes `definition.name` and route paths still say
 * `{streamName}`. nightshift-program#1307 swaps in `nightshift-source` saved
 * object ids without touching this client. The server stamps the id on every
 * revision; it is never part of a write payload.
 *
 * Every read filters on the space the client was built for and every write is
 * stamped with it; callers never see documents from another space.
 */
export class KnowledgeIndicatorClient {
  private readonly writer: IndicatorWriter;
  private readonly reader: IndicatorReader;
  private readonly searcher: IndicatorSearcher;
  private readonly orchestrator: QueryRuleOrchestrator;
  private readonly ttlDays: number;

  constructor(
    deps: KnowledgeIndicatorClientDeps,
    isSignificantEventsEnabled: boolean,
    alertingContext: SignificantEventsAlertingContext,
    config: Pick<
      SignificantEventsTuningConfig,
      'semantic_min_score' | 'rrf_rank_constant' | 'feature_ttl_days'
    > = DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG
  ) {
    const revisionReader = new RevisionReader(deps.esClient, deps.logger, deps.space);
    this.ttlDays = config.feature_ttl_days;
    this.writer = new IndicatorWriter(
      deps.dataStreamClient,
      deps.logger,
      revisionReader,
      config.feature_ttl_days,
      deps.space
    );
    this.reader = new IndicatorReader(revisionReader);
    this.searcher = new IndicatorSearcher(
      deps.esClient,
      deps.logger,
      config,
      revisionReader,
      deps.space
    );
    this.orchestrator = new QueryRuleOrchestrator(
      alertingContext.rulesClient,
      deps.logger,
      isSignificantEventsEnabled,
      this.writer,
      this.reader,
      deps.space
    );
  }

  bulk(sourceId: string, operations: KIBulkOperation[]) {
    return this.writer.bulk(sourceId, operations);
  }

  getDefaultExpiresAt(): string {
    return computeExpiresAt(new Date().toISOString(), this.ttlDays);
  }

  keepAlivePersistentIndicators(
    sourceId: string,
    options: { lastRefreshedBefore: string }
  ): Promise<{ refreshed: number }> {
    return this.writer.keepAlivePersistent(sourceId, options);
  }

  deleteIndicators(sourceId: string) {
    return this.writer.deleteIndicators(sourceId);
  }

  getFeatures(
    sources: string | string[],
    options?: {
      type?: string[];
      excludedType?: string[];
      id?: string[];
      featureIds?: string[];
      minConfidence?: number;
      limit?: number;
      includeExcluded?: boolean;
      includeExpired?: boolean;
      sort?: ComposerSortShorthand[];
    }
  ): Promise<{ hits: Feature[] }> {
    return this.reader.getFeatures(sources, options);
  }

  getExcludedFeatures(sourceId: string): Promise<{ hits: Feature[] }> {
    return this.reader.getExcludedFeatures(sourceId);
  }

  getFeature(sourceId: string, id: string): Promise<Feature> {
    return this.reader.getFeature(sourceId, id);
  }

  getLatestRevisionTimestamp(
    sourceId: string,
    options?: { types?: string[] }
  ): Promise<{ '@timestamp': string } | null> {
    return this.reader.getLatestRevisionTimestamp(sourceId, options);
  }

  getQueryLinks(
    sourceIds: string[],
    filters?: {
      ruleUnbacked?: RuleUnbackedFilter;
      queryIds?: string[];
      queryTypes?: string[];
      ruleIds?: string[];
      minSeverityScore?: number;
      includeExpired?: boolean;
    }
  ): Promise<QueryLink[]> {
    return this.reader.getQueryLinks(sourceIds, filters);
  }

  getSourceToQueryLinksMap(
    sourceIds: string[],
    options?: { includeExpired?: boolean }
  ): Promise<Record<string, QueryLink[]>> {
    return this.reader.getSourceToQueryLinksMap(sourceIds, options);
  }

  bulkGetQueriesByIds(
    sourceId: string,
    ids: string[],
    options?: { includeExpired?: boolean }
  ): Promise<QueryLink[]> {
    return this.reader.bulkGetQueriesByIds(sourceId, ids, options);
  }

  getPromotableUnbackedQueries(filters?: { minSeverityScore?: number }): Promise<QueryLink[]> {
    return this.reader.getPromotableUnbackedQueries(filters);
  }

  getRuleBackedQueryLinks(): Promise<QueryLink[]> {
    return this.reader.getRuleBackedQueryLinks();
  }

  findFeaturesByIds(ids: string[]): Promise<Array<{ id: string; source_id: string }>> {
    return this.reader.findFeaturesByIds(ids);
  }

  getSourceIdsWithKnowledgeIndicators(): Promise<string[]> {
    return this.reader.getSourceIdsWithKnowledgeIndicators();
  }

  /**
   * Sources the sync sweep must reconcile: those with active knowledge
   * indicators unioned with those that still have Nightshift-owned rules. The KI
   * set alone misses sources whose rules outlived all of their KIs — the very
   * orphan-rule case the sweep exists to catch.
   */
  async getSourceIdsToReconcile(): Promise<string[]> {
    const [withIndicators, withOwnedRules] = await Promise.all([
      this.reader.getSourceIdsWithKnowledgeIndicators(),
      this.orchestrator.findSourceIdsWithOwnedRules(),
    ]);
    return [...new Set([...withIndicators, ...withOwnedRules])];
  }

  findIndicators(
    sources: string | string[],
    query: string,
    options?: {
      types?: KnowledgeIndicatorType[];
      searchMode?: SearchMode;
      limit?: number;
      includeExcluded?: boolean;
      featureTypes?: string[];
      featureIds?: string[];
      queryTypes?: string[];
      queryIds?: string[];
      ruleIds?: string[];
      ruleUnbacked?: RuleUnbackedFilter;
    }
  ): Promise<{ hits: KnowledgeIndicator[] }> {
    return this.searcher.findIndicators(sources, query, options);
  }

  findFeatures(
    sources: string | string[],
    query: string,
    options?: {
      searchMode?: SearchMode;
      limit?: number;
      includeExcluded?: boolean;
      featureTypes?: string[];
      featureIds?: string[];
    }
  ): Promise<{ hits: Feature[] }> {
    return this.searcher.findFeatures(sources, query, options);
  }

  findQueries(
    sources: string | string[],
    query: string,
    filters?: {
      ruleUnbacked?: RuleUnbackedFilter;
      queryTypes?: string[];
      queryIds?: string[];
      ruleIds?: string[];
    },
    searchMode?: SearchMode
  ): Promise<QueryLink[]> {
    return this.searcher.findQueries(sources, query, filters, searchMode);
  }

  syncQueries(
    sourceId: string,
    queries: StreamQuery[],
    options?: { currentLinks?: QueryLink[] }
  ): Promise<void> {
    return this.orchestrator.syncQueries(sourceId, queries, options);
  }

  async replaceSourceQueries(
    sourceId: string,
    getNextQueries: (currentLinks: QueryLink[]) => StreamQuery[]
  ): Promise<void> {
    const { [sourceId]: currentLinks } = await this.getSourceToQueryLinksMap([sourceId]);
    await this.syncQueries(sourceId, getNextQueries(currentLinks), { currentLinks });
  }

  upsertQuery(sourceId: string, query: StreamQuery): Promise<void> {
    return this.orchestrator.upsertQuery(sourceId, query);
  }

  deleteQuery(sourceId: string, queryId: string): Promise<void> {
    return this.orchestrator.deleteQuery(sourceId, queryId);
  }

  deleteQueries(sourceId: string, queryIds: string[]): Promise<{ deleted: number }> {
    return this.orchestrator.deleteQueries(sourceId, queryIds);
  }

  deleteAllQueries(sourceId: string): Promise<void> {
    return this.orchestrator.deleteAllQueries(sourceId);
  }

  promoteQueries(sourceId: string, queryIds: string[]): Promise<PromoteQueriesResult> {
    return this.orchestrator.promoteQueries(sourceId, queryIds);
  }

  promoteUnbackedQueries(args: {
    queryIds?: string[];
    minSeverityScore?: number;
    sourceIds: string[];
  }): Promise<PromoteQueriesResult> {
    return this.orchestrator.promoteUnbackedQueries(args);
  }

  demoteQueries(sourceId: string, queryIds: string[]): Promise<{ demoted: number }> {
    return this.orchestrator.demoteQueries(sourceId, queryIds);
  }

  reconcileSource(sourceId: string): Promise<{ tombstoned: number; orphanRulesDeleted: number }> {
    return this.orchestrator.reconcileSource(sourceId);
  }
}
