/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { RELATIONSHIP_KI_TYPE } from '../../common/dreaming';
import {
  applyDreamRelationshipsStepCommonDefinition,
  dreamRelationshipChangeSetSchema,
  type ApplyDreamRelationshipsOutput,
} from '../../common/step_types/apply_dream_relationships';
import type { AiIndexDest, AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import { findKiRevision, isKiDeleted } from '../ai_indices/ki_revision';
import {
  applyOperations,
  refreshWrites,
  type ApplyContext,
  type ApplyResult,
  type PlannedWrite,
} from '../dreaming/apply';
import { kindOf, type DreamedKi } from '../dreaming/dreamed_ki';
import { isVisibleInSpace } from '../dreaming/permissions';
import {
  relationshipRefsOf,
  relationshipTypesOf,
  resolveRelationships,
} from '../dreaming/resolve_relationships';
import type { KiStepDependencies } from './helpers';
import {
  assertContextEngineEnabled,
  assertKiWritePrivilege,
  assertSameMemoryPermissions,
  assertWritableDest,
  kiWriterFromContext,
} from './helpers';

const INACTIVE_STATUSES: ReadonlySet<string> = new Set(['deleted', 'verification_failed']);

const findActiveKi = async ({
  esClient,
  aiIndexId,
  dest,
  kiId,
  spaceId,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  aiIndexId: string;
  dest: AiIndexDest;
  kiId: string;
  spaceId: string;
  abortSignal?: AbortSignal;
}): Promise<DreamedKi | undefined> => {
  const revision = await findKiRevision({
    esClient,
    aiIndexId,
    dest,
    kiId,
    includeSource: true,
    abortSignal,
  });
  const ki = revision?.source as DreamedKi | undefined;
  return ki && !isKiDeleted(ki) && isVisibleInSpace(ki.permissions, spaceId)
    ? { ...ki, id: kiId }
    : undefined;
};

export const getApplyDreamRelationshipsStepDefinition = ({
  getAiIndexService,
  isContextEngineEnabled,
  checkWritePrivilege,
  logger,
}: KiStepDependencies) =>
  createServerStepDefinition({
    ...applyDreamRelationshipsStepCommonDefinition,
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      const stepContext = context.contextManager.getContext();
      const { spaceId } = stepContext.workflow;
      await assertContextEngineEnabled(isContextEngineEnabled, spaceId);
      await assertKiWritePrivilege(checkWritePrivilege, request, spaceId);

      const {
        ai_index_id: aiIndexId,
        memories,
        documents = [],
        dry_run: dryRun = false,
      } = context.input;
      const parsed = dreamRelationshipChangeSetSchema.safeParse(context.input.changes);
      if (!parsed.success) {
        throw new ExecutionError({
          type: 'ValidationError',
          message: `The dreaming model returned invalid relationships: ${parsed.error.message}`,
        });
      }
      const changeSet = parsed.data;
      assertSameMemoryPermissions(memories);

      let aiIndex: AiIndexHttpItem;
      try {
        aiIndex = await getAiIndexService().get(aiIndexId, spaceId);
      } catch (error) {
        if (error instanceof AiIndexNotFoundError) {
          throw new ExecutionError({
            type: 'NotFoundError',
            message: `AI index '${aiIndexId}' not found`,
          });
        }
        throw error;
      }
      assertWritableDest(aiIndexId, aiIndex.dest);
      if (!aiIndex.dreaming) {
        throw new ExecutionError({
          type: 'ValidationError',
          message: `AI index '${aiIndexId}' has no dreaming config`,
        });
      }

      const esClient = context.contextManager.getScopedEsClient();
      const find = (kiId: string) =>
        findActiveKi({
          esClient,
          aiIndexId,
          dest: aiIndex.dest,
          kiId,
          spaceId,
          abortSignal: context.abortSignal,
        });
      const planned = new Map(
        dryRun ? documents.map((document) => [document.id, document as DreamedKi]) : []
      );
      const refs = relationshipRefsOf(changeSet);
      const ends = new Map<string, DreamedKi>();
      for (const kiId of refs.ends) {
        const end = planned.get(kiId) ?? (await find(kiId));
        if (end && kindOf(end) !== undefined) {
          ends.set(kiId, end);
        }
      }
      const existing = new Map<string, DreamedKi>();
      for (const kiId of refs.relationships) {
        const relationship = await find(kiId);
        if (relationship?.type === RELATIONSHIP_KI_TYPE) {
          existing.set(kiId, relationship);
        }
      }

      const memoryPermissions = new Map(
        memories
          .filter(({ governance }) => !INACTIVE_STATUSES.has(governance?.lifecycle?.status ?? ''))
          .map(({ id, permissions }) => [id, permissions])
      );
      const resolved = resolveRelationships(changeSet, {
        relationshipTypes: relationshipTypesOf(aiIndex.dreaming),
        memoryPermissions,
        ends,
        existing,
      });
      const plannedWrites = dryRun ? new Map<string, PlannedWrite>() : undefined;
      const applyContext: ApplyContext = {
        esClient,
        aiIndexId,
        dest: aiIndex.dest,
        writer: kiWriterFromContext(stepContext),
        spaceId,
        memoryPermissions,
        abortSignal: context.abortSignal,
        dryRun: plannedWrites,
        deferRefresh: !dryRun,
      };
      let applied: ApplyResult;
      try {
        applied = await applyOperations(applyContext, resolved.operations);
      } finally {
        if (!dryRun && resolved.operations.length > 0) {
          await refreshWrites(applyContext);
        }
      }
      const { rejected: refused, ...counts } = applied;
      const rejected = [...resolved.rejected, ...refused];

      logger.debug(
        `${dryRun ? 'Dry run: dreaming' : 'Dreaming'} in AI index '${aiIndexId}' created ${
          counts.created
        }, updated ${counts.updated} and deleted ${counts.deleted} relationships; rejected ${
          rejected.length
        }`
      );
      const output: ApplyDreamRelationshipsOutput = {
        ...counts,
        rejected,
        ...(plannedWrites && {
          would_write: [...plannedWrites].map(([id, { change, ki }]) => {
            const document = ki as DreamedKi | undefined;
            return {
              id,
              change,
              ...(document && { type: document.type, title: document.title }),
            };
          }),
        }),
      };
      return { output };
    },
  });
