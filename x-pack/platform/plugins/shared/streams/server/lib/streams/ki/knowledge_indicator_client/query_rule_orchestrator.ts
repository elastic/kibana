/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { QueryLink, StreamQuery } from '@kbn/streams-schema';
import { isDurable, QUERY_TYPE_STATS, deriveQueryType, hasSameEsql } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import { computeRuleId } from '../helpers/compute_rule_id';
import { installQueries, uninstallQueries } from './rule_orchestration';
import { KI_TYPE_QUERY } from '../fields';
import type { KIBulkOperation } from './types';
import type { IRulesManagementClient } from './rules/rules_management_client';
import type { IndicatorWriter } from './indicator_writer';
import type { IndicatorReader } from './indicator_reader';

function isUngrounded(link: QueryLink, liveFeatureIds: Set<string>): boolean {
  if (!link.query.features?.length) return false;
  if (isDurable(link)) return false;
  return link.query.features.some((f) => !liveFeatureIds.has(f.id));
}

/** Structured result returned by {@link QueryRuleOrchestrator.syncGroundedness}. */
export interface SyncGroundednessSummary {
  /** Number of query links tombstoned because their source features are gone. */
  tombstonedQueries: number;
  /** Number of Streams-owned alerting rules deleted by the sweep (orphaned or backing an ungrounded query). */
  sweptRules: number;
  /** Per-stream or global errors collected during best-effort execution. */
  errors: Array<{ stream: string; error: string }>;
}

export class QueryRuleOrchestrator {
  constructor(
    private readonly rulesManagementClient: IRulesManagementClient,
    private readonly logger: Logger,
    private readonly isSignificantEventsEnabled: boolean,
    private readonly writer: IndicatorWriter,
    private readonly reader: IndicatorReader
  ) {}

  async syncQueries(
    definition: Streams.all.Definition,
    queries: StreamQuery[],
    options?: { currentLinks?: QueryLink[] }
  ): Promise<void> {
    const stream = definition.name;
    if (!this.isSignificantEventsEnabled) {
      this.logger.debug(
        `Skipping syncQueries for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    const currentLinks =
      options?.currentLinks ??
      (await this.reader.getStreamToQueryLinksMap([stream], { includeExpired: true }))[stream];
    const currentByQueryId = new Map(currentLinks.map((link) => [link.query.id, link]));
    const nextIds = new Set(queries.map((q) => q.id));

    const toCreate: QueryLink[] = [];
    const toUpdate: QueryLink[] = [];
    const demotedToStats: QueryLink[] = [];
    const allNext: Array<{ query: StreamQuery; rule_backed: boolean; rule_id: string }> = [];

    for (const query of queries) {
      const current = currentByQueryId.get(query.id);
      const isStats = deriveQueryType(query.esql.query) === QUERY_TYPE_STATS;
      const ruleId = computeRuleId(stream, query.id, query.esql.query);
      if (!current) {
        const ruleBacked = !isStats;
        const link: QueryLink = {
          stream_name: stream,
          rule_backed: ruleBacked,
          rule_id: ruleId,
          query: { ...query, type: deriveQueryType(query.esql.query) },
        };
        if (ruleBacked) toCreate.push(link);
        allNext.push({ query: link.query, rule_backed: ruleBacked, rule_id: ruleId });
      } else if (!current.rule_backed || isStats) {
        if (current.rule_backed && isStats) {
          demotedToStats.push(current);
        }
        allNext.push({ query, rule_backed: false, rule_id: current.rule_id });
      } else if (!hasSameEsql(current.query.esql.query, query.esql.query)) {
        const link: QueryLink = {
          stream_name: stream,
          rule_backed: true,
          rule_id: ruleId,
          query: { ...query, type: deriveQueryType(query.esql.query) },
        };
        toCreate.push(link); // breaking change → recreate
        allNext.push({ query: link.query, rule_backed: true, rule_id: ruleId });
      } else {
        const link: QueryLink = { ...current, query };
        toUpdate.push(link);
        allNext.push({ query, rule_backed: true, rule_id: current.rule_id });
      }
    }

    const toUninstall = currentLinks.filter(
      (link) =>
        (link.rule_backed && !nextIds.has(link.query.id)) ||
        toCreate.some((c) => c.query.id === link.query.id && link.rule_backed) ||
        demotedToStats.some((d) => d.query.id === link.query.id)
    );

    try {
      await installQueries(this.rulesManagementClient, toCreate, toUpdate, definition);
    } catch (installError) {
      this.logger.error(
        `installQueries failed during syncQueries for stream "${stream}". Compensating by uninstalling created rules.`
      );
      await uninstallQueries(this.rulesManagementClient, toCreate).catch((compensateError) => {
        this.logger.error(
          `Failed to compensate after installQueries failure for stream "${stream}": ${
            compensateError instanceof Error ? compensateError.message : String(compensateError)
          }`
        );
      });
      throw installError;
    }

    // Install succeeded — safe to remove stale and replaced rules now.
    // Doing this after install preserves monitoring coverage during ESQL-change
    // transitions: the old rule keeps firing until the new one is ready.
    await uninstallQueries(this.rulesManagementClient, toUninstall);

    // Append revisions for every next query and a tombstone for every
    // current link that's no longer in the input set.
    const operations: KIBulkOperation[] = [];
    for (const next of allNext) {
      operations.push({
        index: {
          query: {
            ...next.query,
            rule_backed: next.rule_backed,
            rule_id: next.rule_id,
          },
        },
      });
    }
    for (const link of currentLinks) {
      if (!nextIds.has(link.query.id)) {
        operations.push({ delete: { type: KI_TYPE_QUERY, id: link.query.id } });
      }
    }

    try {
      await this.writer.bulk(stream, operations);
    } catch (storageError) {
      this.logger.error(
        `Storage append failed after rule install for stream "${stream}". Compensating by uninstalling new rules.`
      );
      await uninstallQueries(this.rulesManagementClient, toCreate).catch((compensateError) => {
        this.logger.error(
          `Failed to compensate after bulk failure for stream "${stream}": ${
            compensateError instanceof Error ? compensateError.message : String(compensateError)
          }`
        );
      });
      throw storageError;
    }
  }

  async upsertQuery(definition: Streams.all.Definition, query: StreamQuery): Promise<void> {
    const stream = definition.name;
    if (!this.isSignificantEventsEnabled) {
      this.logger.debug(
        `Skipping upsertQuery for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    const { [stream]: currentLinks } = await this.reader.getStreamToQueryLinksMap([stream], {
      includeExpired: true,
    });
    const currentByQueryId = new Map(currentLinks.map((link) => [link.query.id, link]));
    const existing = currentByQueryId.get(query.id);

    const scopedLinks = currentLinks.filter((l) => l.rule_backed || l.query.id === query.id);

    if (!existing) {
      await this.syncQueries(definition, [...scopedLinks.map((l) => l.query), query], {
        currentLinks: scopedLinks,
      });
      return;
    }
    await this.syncQueries(
      definition,
      scopedLinks.map((l) => (l.query.id === query.id ? query : l.query)),
      { currentLinks: scopedLinks }
    );
  }

  async deleteQuery(definition: Streams.all.Definition, queryId: string): Promise<void> {
    const stream = definition.name;
    if (!this.isSignificantEventsEnabled) {
      this.logger.debug(
        `Skipping deleteQuery for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    const { [stream]: currentLinks } = await this.reader.getStreamToQueryLinksMap([stream]);
    const target = currentLinks.find((link) => link.query.id === queryId);
    if (!target) {
      return;
    }

    if (target.rule_backed) {
      await uninstallQueries(this.rulesManagementClient, [target]);
    }
    await this.writer.bulk(stream, [{ delete: { type: KI_TYPE_QUERY, id: queryId } }]);
  }

  async deleteAllQueries(streamName: string): Promise<void> {
    if (!this.isSignificantEventsEnabled) {
      this.logger.debug(
        `Skipping deleteAllQueries for stream "${streamName}" because significant events feature is disabled.`
      );
      return;
    }

    const { [streamName]: currentLinks } = await this.reader.getStreamToQueryLinksMap(
      [streamName],
      { includeExpired: true }
    );
    const ruleBacked = currentLinks.filter((link) => link.rule_backed);
    if (ruleBacked.length > 0) {
      await uninstallQueries(this.rulesManagementClient, ruleBacked);
    }
    if (currentLinks.length === 0) {
      return;
    }
    await this.writer.bulk(
      streamName,
      currentLinks.map((link) => ({
        delete: { type: KI_TYPE_QUERY, id: link.query.id },
      }))
    );
  }

  async promoteQueries(
    definition: Streams.all.Definition,
    queryIds: string[]
  ): Promise<{ promoted: number; skipped_stats: number }> {
    const streamName = definition.name;
    if (!this.isSignificantEventsEnabled) {
      this.logger.debug(`Skipping promoteQueries because significant events feature is disabled.`);
      return { promoted: 0, skipped_stats: 0 };
    }

    const { [streamName]: links } = await this.reader.getStreamToQueryLinksMap([streamName]);
    const idSet = new Set(queryIds);
    const candidates = links.filter((link) => idSet.has(link.query.id) && !link.rule_backed);

    const skippedStats = candidates.filter((link) => link.query.type === QUERY_TYPE_STATS);
    if (skippedStats.length > 0) {
      this.logger.info(
        `Skipping ${skippedStats.length} STATS queries from promotion for stream "${streamName}" (not yet supported as rules).`
      );
    }

    const toPromote = candidates
      .filter((link) => link.query.type !== QUERY_TYPE_STATS)
      .map((link) => ({
        ...link,
        rule_backed: true,
        rule_id: computeRuleId(streamName, link.query.id, link.query.esql.query),
      }));

    if (toPromote.length === 0) {
      return { promoted: 0, skipped_stats: skippedStats.length };
    }

    await installQueries(this.rulesManagementClient, toPromote, [], definition);

    try {
      await this.writer.bulk(
        streamName,
        toPromote.map((link) => ({
          index: {
            query: {
              ...link.query,
              rule_backed: true,
              rule_id: link.rule_id,
            },
          },
        }))
      );
    } catch (storageError) {
      this.logger.error(
        `Storage append failed after installing rules for stream "${streamName}". Compensating by uninstalling.`
      );
      await uninstallQueries(this.rulesManagementClient, toPromote).catch((uninstallError) => {
        this.logger.error(
          `Failed to compensate — orphaned rules may remain for stream "${streamName}": ${
            uninstallError instanceof Error ? uninstallError.message : String(uninstallError)
          }`
        );
      });
      throw storageError;
    }

    return { promoted: toPromote.length, skipped_stats: skippedStats.length };
  }

  async promoteUnbackedQueries({
    queryIds,
    minSeverityScore,
    streamDefinitions,
  }: {
    queryIds?: string[];
    minSeverityScore?: number;
    streamDefinitions: Map<string, Streams.all.Definition>;
  }): Promise<{ promoted: number; skipped_stats: number }> {
    if (!this.isSignificantEventsEnabled) {
      this.logger.debug(
        `Skipping promoteUnbackedQueries because significant events feature is disabled.`
      );
      return { promoted: 0, skipped_stats: 0 };
    }

    const candidates = await this.reader.getPromotableUnbackedQueries({ minSeverityScore });

    let toPromote = candidates;
    if (queryIds && queryIds.length > 0) {
      const requestedIds = new Set(queryIds);
      toPromote = candidates.filter((link) => requestedIds.has(link.query.id));
    }

    const byStream = new Map<string, string[]>();
    for (const link of toPromote) {
      const group = byStream.get(link.stream_name) ?? [];
      group.push(link.query.id);
      byStream.set(link.stream_name, group);
    }

    let promoted = 0;
    let skippedStats = 0;
    for (const [streamName, ids] of byStream) {
      const definition = streamDefinitions.get(streamName);
      if (!definition) {
        this.logger.warn(`Skipping promotion for missing stream ${streamName}`);
        continue;
      }
      const result = await this.promoteQueries(definition, ids);
      promoted += result.promoted;
      skippedStats += result.skipped_stats;
    }

    return { promoted, skipped_stats: skippedStats };
  }

  /**
   * Three-step groundedness sweep, decoupled from individual query writes.
   *
   * Step 1 — rule-backed queries: enumerate Streams-owned rules, then per-stream
   *   delete orphaned rules (no backing query) and tombstone + delete ungrounded
   *   rule-backed queries (features gone).
   * Step 2 — seam: tombstone rule-backed queries whose rule was deleted out of band
   *   (invisible to step 1 because the rule no longer appears in enumeration).
   * Step 3 — unbacked queries: tombstone ungrounded queries that have no alerting rule.
   *
   * All steps are best-effort: per-stream failures are collected in `errors` and
   * do not abort subsequent work. Partial failures are retried on the next
   * scheduled run.
   */
  async syncGroundedness(streamNames?: string[]): Promise<SyncGroundednessSummary> {
    const summary: SyncGroundednessSummary = { tombstonedQueries: 0, sweptRules: 0, errors: [] };

    if (!this.isSignificantEventsEnabled) {
      this.logger.debug(
        'Skipping syncGroundedness because significant events feature is disabled.'
      );
      return summary;
    }

    if (streamNames?.length === 0) {
      return summary;
    }

    const liveRuleIds = await this.sweepRuleBackedQueries(streamNames, summary);
    await this.tombstoneQueriesWithDeletedRules(liveRuleIds, streamNames, summary);
    await this.sweepUnbackedQueries(streamNames, summary);

    return summary;
  }

  /**
   * Step 1 — enumerate every Streams-owned rule, then per-stream:
   *   • rules with no backing KI query           → delete rule (orphan)
   *   • rules whose query features are gone      → delete rule + tombstone query (ungrounded)
   *
   * Returns the set of rule IDs that exist in the alerting framework (used by step 2).
   */
  private async sweepRuleBackedQueries(
    streamNames: string[] | undefined,
    summary: SyncGroundednessSummary
  ): Promise<Set<string>> {
    const allRules = await this.rulesManagementClient.findStreamsOwnedRules();
    const scopedRules = streamNames
      ? allRules.filter((r) => streamNames.includes(r.streamName))
      : allRules;

    const liveRuleIds = new Set(scopedRules.map((r) => r.id));

    const byStream = new Map<string, string[]>();
    for (const { id, streamName } of scopedRules) {
      const group = byStream.get(streamName) ?? [];
      group.push(id);
      byStream.set(streamName, group);
    }

    if (byStream.size === 0) return liveRuleIds;

    const streamList = [...byStream.keys()];

    const [backedLinks, { hits: liveFeatures }] = await Promise.all([
      this.reader.getQueryLinks(streamList, { ruleUnbacked: 'exclude' }),
      this.reader.getFeatures(streamList),
    ]);

    const queryByRuleIdPerStream = new Map<string, Map<string, QueryLink>>();
    for (const link of backedLinks) {
      const byRuleId = queryByRuleIdPerStream.get(link.stream_name) ?? new Map<string, QueryLink>();
      byRuleId.set(link.rule_id, link);
      queryByRuleIdPerStream.set(link.stream_name, byRuleId);
    }

    const liveFeatureIdsByStream = new Map<string, Set<string>>();
    for (const feature of liveFeatures) {
      const set = liveFeatureIdsByStream.get(feature.stream_name) ?? new Set<string>();
      set.add(feature.id);
      liveFeatureIdsByStream.set(feature.stream_name, set);
    }

    for (const [streamName, ruleIds] of byStream) {
      try {
        const queryByRuleId =
          queryByRuleIdPerStream.get(streamName) ?? new Map<string, QueryLink>();
        const liveFeatureIds = liveFeatureIdsByStream.get(streamName) ?? new Set<string>();

        const orphanRuleIds: string[] = [];
        const ungroundedLinks: QueryLink[] = [];

        for (const ruleId of ruleIds) {
          const link = queryByRuleId.get(ruleId);
          if (!link) {
            orphanRuleIds.push(ruleId);
          } else if (isUngrounded(link, liveFeatureIds)) {
            ungroundedLinks.push(link);
          }
        }

        if (orphanRuleIds.length > 0) {
          await this.rulesManagementClient.bulkDeleteRules(orphanRuleIds);
          summary.sweptRules += orphanRuleIds.length;
        }

        if (ungroundedLinks.length > 0) {
          // Rules come down before the tombstone so no evaluation window fires
          // for a query that is about to disappear.
          await this.rulesManagementClient.bulkDeleteRules(ungroundedLinks.map((l) => l.rule_id));
          await this.writer.bulk(
            streamName,
            ungroundedLinks.map((l) => ({ delete: { type: KI_TYPE_QUERY, id: l.query.id } }))
          );
          summary.sweptRules += ungroundedLinks.length;
          summary.tombstonedQueries += ungroundedLinks.length;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`syncGroundedness step 1: failed for stream "${streamName}": ${message}`);
        summary.errors.push({ stream: streamName, error: message });
      }
    }

    return liveRuleIds;
  }

  /**
   * Step 2 — seam: find rule-backed KI queries whose rule_id is absent from the
   * live rule set collected in step 1. These are rules deleted out of band —
   * step 1 never sees them because they don't appear in enumeration. Tombstone
   * the orphaned queries so the KI data stream stays consistent.
   */
  private async tombstoneQueriesWithDeletedRules(
    liveRuleIds: Set<string>,
    streamNames: string[] | undefined,
    summary: SyncGroundednessSummary
  ): Promise<void> {
    try {
      const backedLinks = await this.reader.getQueryLinks(streamNames ?? [], {
        ruleUnbacked: 'exclude',
      });
      const stale = backedLinks.filter((l) => l.rule_id != null && !liveRuleIds.has(l.rule_id));
      if (stale.length === 0) return;

      const byStream = new Map<string, QueryLink[]>();
      for (const link of stale) {
        const group = byStream.get(link.stream_name) ?? [];
        group.push(link);
        byStream.set(link.stream_name, group);
      }

      for (const [streamName, links] of byStream) {
        try {
          await this.writer.bulk(
            streamName,
            links.map((l) => ({ delete: { type: KI_TYPE_QUERY, id: l.query.id } }))
          );
          summary.tombstonedQueries += links.length;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `syncGroundedness step 2: failed for stream "${streamName}": ${message}`
          );
          summary.errors.push({ stream: streamName, error: message });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`syncGroundedness step 2: failed to fetch query links: ${message}`);
      summary.errors.push({ stream: '*', error: message });
    }
  }

  /**
   * Step 3 — tombstone ungrounded unbacked queries. Rule-backed queries were
   * already handled in steps 1–2, so this step uses `ruleUnbacked: 'only'`.
   */
  private async sweepUnbackedQueries(
    streamNames: string[] | undefined,
    summary: SyncGroundednessSummary
  ): Promise<void> {
    try {
      const unbackedLinks = await this.reader.getQueryLinks(streamNames ?? [], {
        ruleUnbacked: 'only',
      });
      if (unbackedLinks.length === 0) return;

      const streamsToFetch = [...new Set(unbackedLinks.map((l) => l.stream_name))];
      const { hits: liveFeatures } = await this.reader.getFeatures(streamsToFetch);

      const liveByStream = new Map<string, Set<string>>();
      for (const feature of liveFeatures) {
        const set = liveByStream.get(feature.stream_name) ?? new Set<string>();
        set.add(feature.id);
        liveByStream.set(feature.stream_name, set);
      }

      const ungrounded = unbackedLinks.filter((link) =>
        isUngrounded(link, liveByStream.get(link.stream_name) ?? new Set())
      );
      if (ungrounded.length === 0) return;

      const byStream = new Map<string, QueryLink[]>();
      for (const link of ungrounded) {
        const group = byStream.get(link.stream_name) ?? [];
        group.push(link);
        byStream.set(link.stream_name, group);
      }

      for (const [streamName, links] of byStream) {
        try {
          await this.writer.bulk(
            streamName,
            links.map((l) => ({ delete: { type: KI_TYPE_QUERY, id: l.query.id } }))
          );
          summary.tombstonedQueries += links.length;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `syncGroundedness step 3: failed for stream "${streamName}": ${message}`
          );
          summary.errors.push({ stream: streamName, error: message });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`syncGroundedness step 3: failed: ${message}`);
      summary.errors.push({ stream: '*', error: message });
    }
  }

  async demoteQueries(
    definition: Streams.all.Definition,
    queryIds: string[]
  ): Promise<{ demoted: number }> {
    const streamName = definition.name;
    if (!this.isSignificantEventsEnabled) {
      this.logger.debug(`Skipping demoteQueries because significant events feature is disabled.`);
      return { demoted: 0 };
    }

    const { [streamName]: links } = await this.reader.getStreamToQueryLinksMap([streamName]);
    const idSet = new Set(queryIds);
    const toDemote = links.filter((link) => link.rule_backed && idSet.has(link.query.id));

    if (toDemote.length === 0) {
      return { demoted: 0 };
    }

    await uninstallQueries(this.rulesManagementClient, toDemote);

    await this.writer.bulk(
      streamName,
      toDemote.map((link) => ({
        index: {
          query: {
            ...link.query,
            rule_backed: false,
            rule_id: link.rule_id,
          },
        },
      }))
    );

    return { demoted: toDemote.length };
  }
}
