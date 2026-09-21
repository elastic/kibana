/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerSortShorthand } from '@elastic/esql';
import type { Feature, QueryLink } from '@kbn/significant-events-schema';
import { QUERY_TYPE_STATS } from '@kbn/significant-events-schema';
import { isStoredFeatureKnowledgeIndicator, isStoredQueryKnowledgeIndicator } from '../data_stream';
import {
  combineWhere,
  inPredicate,
  notInPredicate,
  IS_NOT_DELETED,
  IS_NOT_EXCLUDED,
  IS_NOT_EXPIRED,
} from '../esql_helpers';
import {
  EXCLUDED,
  FEATURE_SLUG,
  FEATURE_TYPE,
  ID,
  KI_TYPE_FEATURE,
  KI_TYPE_QUERY,
  QUERY_RULE_ID,
  QUERY_RULE_BACKED,
  QUERY_TYPE,
  SOURCE_ID,
  TYPE,
} from '../fields';
import { fromStoredFeature, fromStoredQuery } from './serializers';
import { StatusError } from '../../errors/status_error';
import type { RevisionReader } from './revision_reader';
import type { LatestSourceWhereCondition } from '../../significant_events/latest_source_query';
import type { RuleUnbackedFilter } from './types';

function ruleUnbackedPostGroupingWhere(
  filter: RuleUnbackedFilter | undefined
): LatestSourceWhereCondition | undefined {
  switch (filter) {
    case 'include':
      return undefined;
    case 'only':
      return esql.exp`${esql.col(QUERY_RULE_BACKED)} == false`;
    case 'exclude':
    default:
      return esql.exp`${esql.col(QUERY_RULE_BACKED)} == true`;
  }
}

export class IndicatorReader {
  constructor(private readonly revisionReader: RevisionReader) {}

  async getFeatures(
    sources: string | string[],
    options: {
      type?: string[];
      excludedType?: string[];
      id?: string[];
      featureIds?: string[];
      minConfidence?: number;
      limit?: number;
      includeExcluded?: boolean;
      includeExpired?: boolean;
      sort?: ComposerSortShorthand[];
    } = {}
  ): Promise<{ hits: Feature[] }> {
    const sourceIds = Array.isArray(sources) ? sources : [sources];
    if (sourceIds.length === 0) {
      return { hits: [] };
    }

    const minConfidenceFilter =
      typeof options.minConfidence === 'number'
        ? esql.exp`\`feature.confidence\` >= ${options.minConfidence}`
        : undefined;

    const featureTypesFilter = options.type?.length
      ? inPredicate(FEATURE_TYPE, options.type)
      : undefined;
    const excludedFeatureTypesFilter = options.excludedType?.length
      ? notInPredicate(FEATURE_TYPE, options.excludedType)
      : undefined;
    const featureIdsFilter = options.featureIds?.length
      ? inPredicate(FEATURE_SLUG, options.featureIds)
      : undefined;

    const where = combineWhere(
      inPredicate(TYPE, [KI_TYPE_FEATURE]),
      inPredicate(SOURCE_ID, sourceIds),
      inPredicate(ID, options.id ?? [])
    );

    const postGroupingWhere = combineWhere(
      IS_NOT_DELETED,
      options.includeExcluded ? undefined : IS_NOT_EXCLUDED,
      options.includeExpired ? undefined : IS_NOT_EXPIRED,
      featureTypesFilter,
      excludedFeatureTypesFilter,
      featureIdsFilter,
      minConfidenceFilter
    );

    const docs = await this.revisionReader.fetchLatestRevisions(
      where,
      postGroupingWhere,
      options.sort ?? [['feature.confidence', 'DESC']],
      options.limit
    );
    const hits = docs.filter(isStoredFeatureKnowledgeIndicator).map(fromStoredFeature);
    return { hits };
  }

  async getExcludedFeatures(sourceId: string): Promise<{ hits: Feature[] }> {
    const where = combineWhere(
      inPredicate(TYPE, [KI_TYPE_FEATURE]),
      inPredicate(SOURCE_ID, [sourceId])
    );
    const docs = await this.revisionReader.fetchLatestRevisions(
      where,
      esql.exp`${esql.col(EXCLUDED)} == true`,
      [['@timestamp', 'DESC']]
    );
    const hits = docs.filter(isStoredFeatureKnowledgeIndicator).map(fromStoredFeature);
    return { hits };
  }

  async getFeature(sourceId: string, id: string): Promise<Feature> {
    const { hits } = await this.getFeatures(sourceId, { id: [id] });
    if (hits.length === 0) {
      throw new StatusError(`Feature ${id} not found`, 404);
    }
    return hits[0];
  }

  /**
   * Pure ES|QL probe: returns the timestamp of the most recent **active**
   * feature revision for a source (neither tombstoned nor excluded), optionally
   * scoped to a set of feature types.
   *
   * Only active revisions are counted on purpose, so a `null` result reliably
   * signals an empty active set for the requested types. `shouldIdentifyFeatures`
   * relies on this in two ways: a `null` inferred result forces re-identification
   * (empty or user-wiped set), while the computed-type timestamp drives the
   * recency throttle. Note that this probe does **not** filter on `expires_at`,
   * so it includes durable (`expires_at IS NULL`) revisions that keep-alive
   * re-stamps — callers that need a keep-alive-immune signal must scope to types
   * that are always expiring (e.g. `COMPUTED_FEATURE_TYPES`).
   */
  async getLatestRevisionTimestamp(
    sourceId: string,
    options: { types?: string[] } = {}
  ): Promise<{ '@timestamp': string } | null> {
    const featureTypesFilter = options.types?.length
      ? inPredicate(FEATURE_TYPE, options.types)
      : undefined;
    const where = combineWhere(
      inPredicate(TYPE, [KI_TYPE_FEATURE]),
      inPredicate(SOURCE_ID, [sourceId])
    );

    const docs = await this.revisionReader.fetchLatestRevisions(
      where,
      combineWhere(IS_NOT_DELETED, IS_NOT_EXCLUDED, IS_NOT_EXPIRED, featureTypesFilter)
    );
    if (docs.length === 0) return null;

    const latest = docs.reduce((best, current) =>
      current['@timestamp'] > best['@timestamp'] ? current : best
    );
    return { '@timestamp': latest['@timestamp'] };
  }

  async getQueryLinks(
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
    const minSeverityFilter =
      typeof filters?.minSeverityScore === 'number'
        ? esql.exp`\`query.severity_score\` >= ${filters.minSeverityScore}`
        : undefined;
    const queryTypesFilter = filters?.queryTypes?.length
      ? inPredicate(QUERY_TYPE, filters.queryTypes)
      : undefined;
    const ruleIdsFilter = filters?.ruleIds?.length
      ? inPredicate(QUERY_RULE_ID, filters.ruleIds)
      : undefined;

    const where = combineWhere(
      inPredicate(TYPE, [KI_TYPE_QUERY]),
      inPredicate(SOURCE_ID, sourceIds),
      inPredicate(ID, filters?.queryIds ?? [])
    );

    const postGroupingWhere = combineWhere(
      IS_NOT_DELETED,
      filters?.includeExpired ? undefined : IS_NOT_EXPIRED,
      ruleUnbackedPostGroupingWhere(filters?.ruleUnbacked ?? 'exclude'),
      queryTypesFilter,
      ruleIdsFilter,
      minSeverityFilter
    );

    const docs = await this.revisionReader.fetchLatestRevisions(where, postGroupingWhere);
    return docs.filter(isStoredQueryKnowledgeIndicator).map(fromStoredQuery);
  }

  async getSourceToQueryLinksMap(
    sourceIds: string[],
    options: { includeExpired?: boolean } = {}
  ): Promise<Record<string, QueryLink[]>> {
    const links = await this.getQueryLinks(sourceIds, {
      ruleUnbacked: 'include',
      includeExpired: options.includeExpired,
    });
    const result: Record<string, QueryLink[]> = {};
    for (const sourceId of sourceIds) {
      result[sourceId] = [];
    }
    for (const link of links) {
      if (!result[link.source_id]) {
        result[link.source_id] = [];
      }
      result[link.source_id].push(link);
    }
    return result;
  }

  async bulkGetQueriesByIds(
    sourceId: string,
    ids: string[],
    options: { includeExpired?: boolean } = {}
  ): Promise<QueryLink[]> {
    if (ids.length === 0) return [];
    return this.getQueryLinks([sourceId], {
      queryIds: ids,
      ruleUnbacked: 'include',
      includeExpired: options.includeExpired,
    });
  }

  async getRuleBackedQueryLinks(): Promise<QueryLink[]> {
    const where = inPredicate(TYPE, [KI_TYPE_QUERY]);

    const postGroupingWhere = combineWhere(
      IS_NOT_DELETED,
      esql.exp`${esql.col(QUERY_RULE_BACKED)} == true`
    );

    const docs = await this.revisionReader.fetchLatestRevisions(where, postGroupingWhere);
    return docs.filter(isStoredQueryKnowledgeIndicator).map(fromStoredQuery);
  }

  /**
   * Returns all unbacked, non-STATS queries across sources. Filtering by
   * `query.query_type != stats` happens via the post-grouping WHERE so the
   * latest revision drives the decision.
   */
  async getPromotableUnbackedQueries(filters?: {
    minSeverityScore?: number;
  }): Promise<QueryLink[]> {
    const minSeverityFilter =
      typeof filters?.minSeverityScore === 'number'
        ? esql.exp`\`query.severity_score\` >= ${filters.minSeverityScore}`
        : undefined;

    const where = inPredicate(TYPE, [KI_TYPE_QUERY]);

    const postGroupingWhere = combineWhere(
      IS_NOT_DELETED,
      IS_NOT_EXPIRED,
      esql.exp`\`query.rule_backed\` == false`,
      esql.exp`\`query.query_type\` != ${esql.str(QUERY_TYPE_STATS)}`,
      minSeverityFilter
    );

    const docs = await this.revisionReader.fetchLatestRevisions(where, postGroupingWhere);
    return docs.filter(isStoredQueryKnowledgeIndicator).map(fromStoredQuery);
  }

  async findFeaturesByIds(ids: string[]): Promise<Array<{ id: string; source_id: string }>> {
    if (ids.length === 0) return [];
    const where = combineWhere(inPredicate(TYPE, [KI_TYPE_FEATURE]), inPredicate(ID, ids));
    const docs = await this.revisionReader.fetchLatestRevisions(where, IS_NOT_DELETED);
    return docs.filter(isStoredFeatureKnowledgeIndicator).map((doc) => ({
      id: doc.id,
      source_id: doc['source.id'],
    }));
  }

  /**
   * Returns distinct source ids that have at least one active (non-deleted) KI revision.
   */
  async getSourceIdsWithKnowledgeIndicators(): Promise<string[]> {
    const where = inPredicate(TYPE, [KI_TYPE_FEATURE, KI_TYPE_QUERY]);
    return this.revisionReader.fetchDistinctSourceIds(where, IS_NOT_DELETED);
  }
}
