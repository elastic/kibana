/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  MAX_PURGE_KIS,
  purgeKisInputSchema,
  purgeKisStepCommonDefinition,
  type PurgeKiState,
} from '../../common/step_types/purge_kis';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { buildAiIndexSpaceFilter } from '../../common/space_filter';
import { kiCurrentRevisionPipeline } from '../ai_indices/ki_lifecycle';
import { toEsqlStringLiteral } from '../ai_indices/trace_queries';
import type { AiIndexStepDependencies } from './helpers';
import {
  assertContextEngineEnabled,
  assertKiWritePrivilege,
  assertWritableDest,
  resolveAiIndex,
} from './helpers';
import { toStepError } from './to_step_error';

const STATE_CONDITIONS: Record<PurgeKiState, string> = {
  deleted: 'governance.lifecycle.status == "deleted"',
  verification_failed: 'governance.lifecycle.status == "verification_failed"',
  expired: 'expires_at IS NOT NULL AND expires_at <= NOW()',
};

const isPrefixPattern = (type: string): boolean => type.endsWith('*');

/** `memory.*` matches a prefix with ES|QL `LIKE`; anything else matches exactly. */
const typeCondition = (types: string[]): string =>
  types
    .map((type) =>
      isPrefixPattern(type)
        ? `type LIKE ${toEsqlStringLiteral(type)}`
        : `type == ${toEsqlStringLiteral(type)}`
    )
    .join(' OR ');

const typeFilter = (types: string[]) => ({
  bool: {
    should: types.map((type) =>
      isPrefixPattern(type) ? { prefix: { type: type.slice(0, -1) } } : { term: { type } }
    ),
    minimum_should_match: 1,
  },
});

/**
 * The ES|QL that finds the KIs to purge: their current revision is in one of `states` and was last
 * written `olderThanDays` ago or earlier. On a data stream an older revision must never decide, or
 * purging a tombstone alone would bring back the active revision under it.
 */
export const buildPurgeCandidatesQuery = ({
  dest,
  types,
  states,
  olderThanDays,
}: {
  dest: AiIndexDest;
  types: string[];
  states: PurgeKiState[];
  olderThanDays: number;
}): string =>
  [
    `FROM ${dest.value} METADATA _id, _index`,
    ...kiCurrentRevisionPipeline(dest.type),
    `WHERE ${typeCondition(types)}`,
    `WHERE ${states.map((state) => `(${STATE_CONDITIONS[state]})`).join(' OR ')}`,
    `WHERE COALESCE(updated_at, @timestamp) <= NOW() - ${olderThanDays} days`,
    'KEEP id',
    `LIMIT ${MAX_PURGE_KIS + 1}`,
  ].join('\n| ');

const deleteRevisions = async ({
  esClient,
  dest,
  ids,
  types,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  dest: AiIndexDest;
  ids: string[];
  types: string[];
  spaceId: string;
}): Promise<number> => {
  const { deleted } = await esClient.deleteByQuery({
    index: dest.value,
    refresh: true,
    conflicts: 'proceed',
    query: {
      bool: {
        filter: [typeFilter(types), buildAiIndexSpaceFilter(spaceId)],
        // Documents written before `id` existed are matched by `_id`.
        should: [{ terms: { id: ids } }, { terms: { _id: ids } }],
        minimum_should_match: 1,
      },
    },
  });
  return deleted ?? 0;
};

export const getPurgeKisStepDefinition = ({
  getAiIndexService,
  isContextEngineEnabled,
  checkWritePrivilege,
}: AiIndexStepDependencies) =>
  createServerStepDefinition({
    ...purgeKisStepCommonDefinition,
    handler: async (context) => {
      try {
        const request = context.contextManager.getFakeRequest();
        const { spaceId } = context.contextManager.getContext().workflow;
        await assertContextEngineEnabled(isContextEngineEnabled, spaceId);
        await assertKiWritePrivilege(checkWritePrivilege, request, spaceId);

        // The engine hands over the rendered input unparsed; parse it to apply the defaults.
        const {
          ai_index_id: aiIndexId,
          types,
          states,
          older_than_days: olderThanDays,
          dry_run: dryRun,
        } = purgeKisInputSchema.parse(context.input);
        const { dest } = await resolveAiIndex(getAiIndexService, aiIndexId, spaceId);
        assertWritableDest(aiIndexId, dest);

        // As the workflow owner: Elasticsearch authorizes both the read and the delete.
        const esClient = context.contextManager.getScopedEsClient();
        // A backing index can be shared by AI indices of several spaces; only this space's KIs.
        const { values } = await esClient.esql.query({
          query: buildPurgeCandidatesQuery({ dest, types, states, olderThanDays }),
          filter: buildAiIndexSpaceFilter(spaceId),
        });
        const candidates = values.flatMap(([id]) => (typeof id === 'string' ? [id] : []));
        const truncated = candidates.length > MAX_PURGE_KIS;
        const ids = candidates.slice(0, MAX_PURGE_KIS);

        if (dryRun || ids.length === 0) {
          return { output: { ids, deleted: 0, truncated } };
        }

        const deleted = await deleteRevisions({ esClient, dest, ids, types, spaceId });
        return { output: { ids, deleted, truncated } };
      } catch (error) {
        throw toStepError(error, 'Failed to purge knowledge indicators');
      }
    },
  });
