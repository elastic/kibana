/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { Logger } from '@kbn/logging';
import { getErrorMessage } from '../../../../../common';
import { ENTITY_ID_FIELD } from '../../../../../common/domain/definitions/common_fields';
import { getFieldValue } from '../../../../../common/domain/euid/commons';
import { executeEsqlQuery } from '../../../../infra/elasticsearch/esql';
import { searchEntitiesByIds } from '../../../../infra/elasticsearch/resolution';
import { resolveLatestEntitiesIndexName } from '../../../asset_manager/resolve_entity_store_indices';
import type { ResolutionClient } from '../../resolution_client';
import { selectTarget, type TargetSelectionEntity } from '../../target_selection';
import type { MaintainerTelemetryClient } from '../../../../tasks/entity_maintainers/maintainer_telemetry_client';
import type { PerRuleState } from '../maintainers/automated_resolution/types';
import type { EsqlMatchSpec } from '../rule_registry';
import {
  ENTITY_NAMESPACE_FIELD,
  GROUP_SIZE_CEILING,
  MATCH_GROUP_COLUMNS,
  MATCHER_PAGE_SIZE,
  RESOLVED_TO_FIELD,
  WATERMARK_COLUMN,
} from './constants';
import { buildMatchGroupsQuery, buildWatermarkQuery } from './query';

export interface RunEsqlMatcherDeps {
  state: PerRuleState;
  namespace: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  resolutionClient: ResolutionClient;
  signal: AbortSignal;
  telemetry: MaintainerTelemetryClient;
  spec: EsqlMatchSpec;
  ruleId: string;
  pageSize?: number;
  /**
   * Entity ids written earlier in this maintainer tick (this rule or a previous
   * one). Groups that overlap these ids are skipped so we do not write against
   * documents Elasticsearch has not refreshed yet.
   */
  mutatedIds?: Set<string>;
}

interface MatchGroupRow {
  matchValue: string;
  unresolvedIds: string[];
  unresolvedNamespaces: string[];
  existingTargetIds: string[];
  unresolvedCount: number;
  groupSize: number;
}

interface FetchedEntity extends TargetSelectionEntity {
  resolvedTo?: string;
}

interface BucketStats {
  resolutionsCreated: number;
  skippedAmbiguousBuckets: number;
  skippedOversizedBuckets: number;
  skippedNoopBuckets: number;
  skippedBlockedBuckets: number;
  skippedStaleOverlapBuckets: number;
  cascadeRetargeted: number;
  cascadesBlocked: number;
  failedBuckets: number;
  appliedBuckets: number;
  examinedBuckets: number;
}

const emptyStats = (): BucketStats => ({
  resolutionsCreated: 0,
  skippedAmbiguousBuckets: 0,
  skippedOversizedBuckets: 0,
  skippedNoopBuckets: 0,
  skippedBlockedBuckets: 0,
  skippedStaleOverlapBuckets: 0,
  cascadeRetargeted: 0,
  cascadesBlocked: 0,
  failedBuckets: 0,
  appliedBuckets: 0,
  examinedBuckets: 0,
});

export async function runEsqlMatcherRule(deps: RunEsqlMatcherDeps): Promise<PerRuleState> {
  const { state, namespace, esClient, logger, resolutionClient, signal, telemetry, spec, ruleId } =
    deps;
  const pageSize = deps.pageSize ?? MATCHER_PAGE_SIZE;
  const mutatedIds = deps.mutatedIds ?? new Set<string>();
  const index = await resolveLatestEntitiesIndexName(esClient, namespace);

  const maxTimestamp = await readWatermarkCandidate(
    esClient,
    index,
    spec,
    state.lastProcessedTimestamp,
    signal
  );

  if (signal.aborted) {
    logger.debug(`Aborted ${ruleId} before match-group pagination`);
    return state;
  }

  const stats = emptyStats();
  let afterMatchValue: string | undefined;

  do {
    const query = buildMatchGroupsQuery({
      index,
      spec,
      afterMatchValue,
      watermark: state.lastProcessedTimestamp,
      pageSize,
    });
    const response = await executeEsqlQuery({ esClient, query, signal });
    assertCompleteEsqlResults(response, ruleId);
    const rows = parseMatchGroupRows(response);

    for (const row of rows) {
      if (signal.aborted) {
        logger.debug(`Aborted ${ruleId} while resolving match groups`);
        return state;
      }
      await resolveMatchGroup(row, {
        esClient,
        index,
        resolutionClient,
        logger,
        stats,
        ruleId,
        mutatedIds,
      });
    }

    if (rows.length < pageSize) {
      break;
    }
    afterMatchValue = rows[rows.length - 1].matchValue;
  } while (afterMatchValue && !signal.aborted);

  if (signal.aborted) {
    return state;
  }

  const skippedBuckets =
    stats.skippedAmbiguousBuckets +
    stats.skippedOversizedBuckets +
    stats.skippedNoopBuckets +
    stats.skippedBlockedBuckets +
    stats.skippedStaleOverlapBuckets;

  logger.info(
    `${ruleId}: ${stats.resolutionsCreated} links, ${stats.cascadeRetargeted} cascade retargets, ${stats.cascadesBlocked} cascades blocked, ${stats.skippedAmbiguousBuckets} ambiguous skips, ${stats.skippedOversizedBuckets} oversized skips, ${stats.skippedNoopBuckets} no-op skips, ${stats.skippedBlockedBuckets} blocked skips, ${stats.skippedStaleOverlapBuckets} stale-overlap skips, ${stats.failedBuckets} failed`
  );

  telemetry.report({
    scope: { kind: 'rule', value: ruleId },
    funnel: {
      scanned: stats.examinedBuckets,
      qualified: stats.appliedBuckets + skippedBuckets,
      applied: stats.appliedBuckets,
      skipped: skippedBuckets,
      failed: stats.failedBuckets,
    },
    breakdown: [
      { name: 'examined', count: stats.examinedBuckets },
      { name: 'links_created', count: stats.resolutionsCreated },
      { name: 'cascade_retargeted', count: stats.cascadeRetargeted },
      { name: 'cascades_blocked', count: stats.cascadesBlocked },
      { name: 'ambiguous_skips', count: stats.skippedAmbiguousBuckets },
      { name: 'oversized_skips', count: stats.skippedOversizedBuckets },
      { name: 'noop_skips', count: stats.skippedNoopBuckets },
      { name: 'blocked_skips', count: stats.skippedBlockedBuckets },
      { name: 'stale_overlap_skips', count: stats.skippedStaleOverlapBuckets },
    ],
  });

  // Oversized groups still advance the watermark: holding it for a permanently
  // oversized value (shared mailbox, fleet-wide service SID) would pin the
  // entire rule. Stale-overlap skips and failures do hold it so we retry.
  const holdWatermark = stats.failedBuckets > 0 || stats.skippedStaleOverlapBuckets > 0;

  return {
    lastProcessedTimestamp: holdWatermark
      ? state.lastProcessedTimestamp
      : maxTimestamp ?? state.lastProcessedTimestamp,
    lastRun: {
      resolutionsCreated: stats.resolutionsCreated,
      skippedAmbiguousBuckets: stats.skippedAmbiguousBuckets,
      skippedOversizedBuckets: stats.skippedOversizedBuckets,
      skippedNoopBuckets: stats.skippedNoopBuckets,
      cascadeRetargeted: stats.cascadeRetargeted,
      cascadesBlocked: stats.cascadesBlocked,
    },
  };
}

async function readWatermarkCandidate(
  esClient: ElasticsearchClient,
  index: string,
  spec: EsqlMatchSpec,
  watermark: string | null,
  signal: AbortSignal
): Promise<string | null> {
  const query = buildWatermarkQuery({ index, spec, watermark });
  const response = await executeEsqlQuery({ esClient, query, signal });
  assertCompleteEsqlResults(response, 'watermark');
  const maxTsIndex = requireColumn(response, WATERMARK_COLUMN);
  if (response.values.length === 0) {
    return null;
  }
  return toTimestamp(response.values[0][maxTsIndex]);
}

async function resolveMatchGroup(
  row: MatchGroupRow,
  deps: {
    esClient: ElasticsearchClient;
    index: string;
    resolutionClient: ResolutionClient;
    logger: Logger;
    stats: BucketStats;
    ruleId: string;
    mutatedIds: Set<string>;
  }
): Promise<void> {
  const { logger, stats, ruleId, resolutionClient, mutatedIds } = deps;
  stats.examinedBuckets++;

  if (row.groupSize > GROUP_SIZE_CEILING) {
    stats.skippedOversizedBuckets++;
    logger.warn(
      `${ruleId}: declining oversized bucket '${row.matchValue}' with ${row.groupSize} entities (ceiling ${GROUP_SIZE_CEILING})`
    );
    return;
  }

  if (row.unresolvedNamespaces.length < row.unresolvedCount) {
    // Two unresolved entities in one namespace (including two `local` hosts
    // sharing an email) decline the whole group, including a clear IDP pair
    // sitting next to them. Decline-all is intentional: dropping the doubled
    // namespace can promote a worse target (two ADs + one Okta → Okta wins).
    stats.skippedAmbiguousBuckets++;
    logger.warn(
      `${ruleId}: declining ambiguous bucket '${row.matchValue}': ${row.unresolvedCount} unresolved entities across ${row.unresolvedNamespaces.length} namespaces`
    );
    return;
  }

  if (row.unresolvedIds.length < 2 && row.existingTargetIds.length === 0) {
    return;
  }

  const groupIds = [...row.unresolvedIds, ...row.existingTargetIds];
  if (groupIds.some((id) => mutatedIds.has(id))) {
    stats.skippedStaleOverlapBuckets++;
    logger.debug(
      `${ruleId}: skipping bucket '${row.matchValue}' overlapping ids written earlier this tick`
    );
    return;
  }

  try {
    const idsToFetch = [...new Set(groupIds)];
    const entities = await fetchEntities(deps.esClient, deps.index, idsToFetch);
    const unresolved = row.unresolvedIds
      .map((id) => entities.get(id))
      .filter((entity): entity is FetchedEntity => entity != null);
    const existingTargets = row.existingTargetIds
      .map((id) => entities.get(id))
      .filter((entity): entity is FetchedEntity => entity != null);

    const candidates = uniqueById([...unresolved, ...existingTargets]);
    if (candidates.length === 0) {
      logger.debug(
        `${ruleId}: expected entities for bucket '${row.matchValue}' but Elasticsearch returned none`
      );
      return;
    }

    const target = selectTarget(candidates);
    // Existing targets from TOP(resolved_to) are often outside this group
    // (different match value, namespace filter, or MV_COUNT). They can win
    // selectTarget; when they lose they must be aliased so cascade retargets
    // their trees. Skip mid-chain aliases — cascadeLinkEntities rejects them.
    const aliasIds = [
      ...new Set([
        ...unresolved.map((entity) => entity.entityId),
        ...existingTargets.filter((entity) => !entity.resolvedTo).map((entity) => entity.entityId),
      ]),
    ].filter((id) => id !== target.entityId);

    if (aliasIds.length === 0) {
      stats.skippedNoopBuckets++;
      logger.debug(`${ruleId}: no-op bucket '${row.matchValue}' (already resolved)`);
      return;
    }

    // Do not pass `signal` into cascade writes. `_bulk` is not atomic: aborting
    // mid-flight can move a subset of aliases and leave a split graph. Let this
    // one write finish, then honor abort before the next group.
    const result = await resolutionClient.cascadeLinkEntities(target.entityId, aliasIds);
    stats.resolutionsCreated += result.linked.length;
    stats.cascadeRetargeted += result.retargeted.length;
    stats.cascadesBlocked += result.cascadesBlocked;
    if (result.linked.length > 0 || result.retargeted.length > 0) {
      stats.appliedBuckets++;
      for (const id of [target.entityId, ...result.linked, ...result.retargeted]) {
        mutatedIds.add(id);
      }
    } else if (result.cascadesBlocked > 0) {
      stats.skippedBlockedBuckets++;
    }
  } catch (err) {
    stats.failedBuckets++;
    logger.warn(`${ruleId}: failed to resolve bucket '${row.matchValue}': ${getErrorMessage(err)}`);
  }
}

async function fetchEntities(
  esClient: ElasticsearchClient,
  index: string,
  entityIds: string[]
): Promise<Map<string, FetchedEntity>> {
  const entities = new Map<string, FetchedEntity>();
  if (entityIds.length === 0) {
    return entities;
  }

  const response = await searchEntitiesByIds(esClient, {
    index,
    entityIdField: ENTITY_ID_FIELD,
    entityIds,
    source: [ENTITY_ID_FIELD, ENTITY_NAMESPACE_FIELD, RESOLVED_TO_FIELD],
  });

  for (const hit of response.hits.hits) {
    const source = hit._source;
    const entityId = getFieldValue(source, ENTITY_ID_FIELD);
    if (!entityId) {
      continue;
    }
    entities.set(entityId, {
      entityId,
      namespace: getFieldValue(source, ENTITY_NAMESPACE_FIELD) ?? '',
      resolvedTo: getFieldValue(source, RESOLVED_TO_FIELD),
    });
  }

  return entities;
}

function parseMatchGroupRows(response: ESQLSearchResponse): MatchGroupRow[] {
  const matchValueIdx = requireColumn(response, MATCH_GROUP_COLUMNS.matchValue);
  const idsIdx = requireColumn(response, MATCH_GROUP_COLUMNS.ids);
  const nsIdx = requireColumn(response, MATCH_GROUP_COLUMNS.unresolvedNs);
  const targetsIdx = requireColumn(response, MATCH_GROUP_COLUMNS.existingTargets);
  const unresolvedNIdx = requireColumn(response, MATCH_GROUP_COLUMNS.unresolvedN);
  const nIdx = requireColumn(response, MATCH_GROUP_COLUMNS.totalN);

  return response.values.flatMap((row) => {
    const matchValue = row[matchValueIdx];
    if (matchValue == null || matchValue === '') {
      return [];
    }
    return [
      {
        matchValue: String(matchValue),
        unresolvedIds: toStringArray(row[idsIdx]),
        unresolvedNamespaces: toStringArray(row[nsIdx]),
        existingTargetIds: toStringArray(row[targetsIdx]),
        unresolvedCount: toNumber(row[unresolvedNIdx]),
        groupSize: toNumber(row[nIdx]),
      },
    ];
  });
}

function assertCompleteEsqlResults(response: ESQLSearchResponse, context: string): void {
  if ((response as ESQLSearchResponse & { is_partial?: boolean }).is_partial === true) {
    throw new Error(`${context}: ES|QL returned partial results; watermark will not advance`);
  }
}

function requireColumn(response: ESQLSearchResponse, name: string): number {
  const index = columnIndex(response, name);
  if (index < 0) {
    throw new Error(`ES|QL match-group response missing column '${name}'`);
  }
  return index;
}

function columnIndex(response: ESQLSearchResponse, name: string): number {
  return response.columns.findIndex((column) => column.name === name);
}

function toStringArray(value: unknown): string[] {
  if (value == null) {
    return [];
  }
  const values = Array.isArray(value) ? value : [value];
  return values.filter((item) => item != null && item !== '').map(String);
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toTimestamp(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return null;
}

function uniqueById<T extends { entityId: string }>(entities: T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const entity of entities) {
    if (seen.has(entity.entityId)) {
      continue;
    }
    seen.add(entity.entityId);
    unique.push(entity);
  }
  return unique;
}
