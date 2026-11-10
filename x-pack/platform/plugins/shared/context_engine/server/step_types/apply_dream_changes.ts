/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import {
  applyDreamChangesStepCommonDefinition,
  dreamChangeSetSchema,
  type ApplyDreamChangesOutput,
} from '../../common/step_types/apply_dream_changes';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import { findKiRevision, isKiDeleted } from '../ai_indices/ki_revision';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { createVerifyEsql, keepVerifiedPatterns } from '../dreaming/access_patterns';
import { applyOperations, type PlannedWrite } from '../dreaming/apply';
import { kindOf, type DreamedKi } from '../dreaming/dreamed_ki';
import { audienceKeyOf, isVisibleInSpace } from '../dreaming/permissions';
import { referencedIds, resolveChangeSet, vocabularyOf } from '../dreaming/resolve_change_set';
import type { KiStepDependencies } from './helpers';
import {
  assertContextEngineEnabled,
  assertKiWritePrivilege,
  assertWritableDest,
  kiWriterFromContext,
} from './helpers';

const INACTIVE_STATUSES: ReadonlySet<string> = new Set(['deleted', 'verification_failed']);

const isInactiveStatus = (status: string | undefined): boolean =>
  status !== undefined && INACTIVE_STATUSES.has(status);

export const getApplyDreamChangesStepDefinition = ({
  getAiIndexService,
  isContextEngineEnabled,
  checkWritePrivilege,
  logger,
}: KiStepDependencies) =>
  createServerStepDefinition({
    ...applyDreamChangesStepCommonDefinition,
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      const stepContext = context.contextManager.getContext();
      const { spaceId } = stepContext.workflow;
      await assertContextEngineEnabled(isContextEngineEnabled, spaceId);
      await assertKiWritePrivilege(checkWritePrivilege, request, spaceId);

      const { ai_index_id: aiIndexId, memories, dry_run: dryRun = false } = context.input;
      const parsed = dreamChangeSetSchema.safeParse(context.input.changes);
      if (!parsed.success) {
        throw new ExecutionError({
          type: 'ValidationError',
          message: `The dreaming model returned an invalid change set: ${parsed.error.message}`,
        });
      }
      const changeSet = parsed.data;

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
      const existing = new Map<string, DreamedKi>();
      for (const kiId of referencedIds(changeSet)) {
        const revision = await findKiRevision({
          esClient,
          aiIndexId,
          dest: aiIndex.dest,
          kiId,
          includeSource: true,
          abortSignal: context.abortSignal,
        });
        const ki = revision?.source as DreamedKi | undefined;
        if (
          ki &&
          !isKiDeleted(ki) &&
          kindOf(ki) !== undefined &&
          isVisibleInSpace(ki.permissions, spaceId)
        ) {
          existing.set(kiId, { ...ki, id: kiId });
        }
      }

      const resolved = resolveChangeSet(changeSet, {
        executionId: stepContext.execution.id,
        vocabulary: vocabularyOf(aiIndex.dreaming),
        memories: new Map(
          memories
            .filter(({ governance }) => !isInactiveStatus(governance?.lifecycle?.status))
            .map(({ id, updated_at: updatedAt }) => [id, updatedAt])
        ),
        existing,
        audience: audienceKeyOf(memories.map(({ permissions }) => permissions)),
      });
      const { operations, dropped } = await keepVerifiedPatterns(
        resolved.operations,
        createVerifyEsql({ esClient, logger, abortSignal: context.abortSignal })
      );
      const planned = dryRun ? new Map<string, PlannedWrite>() : undefined;
      const counts = await applyOperations(
        {
          esClient,
          aiIndexId,
          dest: aiIndex.dest,
          writer: kiWriterFromContext(stepContext),
          spaceId,
          memoryPermissions: new Map(memories.map(({ id, permissions }) => [id, permissions])),
          abortSignal: context.abortSignal,
          dryRun: planned,
        },
        operations
      );

      logger.debug(
        `${dryRun ? 'Dry run: dreaming' : 'Dreaming'} in AI index '${aiIndexId}' created ${
          counts.created
        }, updated ${counts.updated} and deleted ${counts.deleted} KIs; rejected ${
          resolved.rejected.length
        } items and dropped ${dropped} access patterns`
      );
      const output: ApplyDreamChangesOutput = {
        ...counts,
        rejected: resolved.rejected,
        dropped_access_patterns: dropped,
        ...(planned && {
          would_write: [...planned].map(([id, { change, ki }]) => {
            const document = ki as DreamedKi | undefined;
            return {
              id,
              change,
              ...(document && { type: document.type, title: document.title }),
            };
          }),
          documents: [...planned.values()].flatMap(({ ki }) => (ki ? [ki as DreamedKi] : [])),
        }),
      };
      return { output };
    },
  });
