/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  recordMaintenanceRunStepCommonDefinition,
  type RecordMaintenanceRunOutput,
} from '../../common/step_types/record_maintenance_run';
import {
  MAX_MAINTENANCE_LISTED_CHANGES,
  MAX_MAINTENANCE_RETRY_IDS,
  type MaintenanceChange,
} from '../../common/step_types/gather_maintenance';
import { modelRemovalsOf } from '../maintenance/limits';
import { resolveDreamingAiIndex } from './gather_maintenance';
import type { DreamingKiStepDependencies } from './helpers';
import { assertDreamingAvailable, assertKiWritePrivilege } from './helpers';

const countOf = (changes: MaintenanceChange[], change: MaintenanceChange['change']): number =>
  changes.filter((candidate) => candidate.change === change).length;

export const getRecordMaintenanceRunStepDefinition = ({
  getAiIndexService,
  isDreamingAvailable,
  checkWritePrivilege,
  logger,
}: Pick<
  DreamingKiStepDependencies,
  'getAiIndexService' | 'isDreamingAvailable' | 'checkWritePrivilege' | 'logger'
>) =>
  createServerStepDefinition({
    ...recordMaintenanceRunStepCommonDefinition,
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      const { spaceId } = context.contextManager.getContext().workflow;
      await assertDreamingAvailable(isDreamingAvailable, spaceId);
      await assertKiWritePrivilege(checkWritePrivilege, request, spaceId);
      await resolveDreamingAiIndex(getAiIndexService, context.input.ai_index_id, spaceId);

      const {
        ai_index_id: aiIndexId,
        mode,
        reviewed,
        rejected,
        model_written: modelWritten = 0,
        model_changes: modelChanges = [],
        model_needs_review: modelNeedsReview = [],
        max_model_removals: maxModelRemovals,
        held_back: heldBackBefore = [],
        retried = [],
      } = context.input;
      const removals = modelRemovalsOf(modelChanges);
      const overLimit = maxModelRemovals !== undefined && removals > maxModelRemovals;
      const written = context.input.written + (overLimit ? 0 : modelWritten);
      const changes = [...context.input.changes, ...(overLimit ? [] : modelChanges)];
      const needsReview = [...context.input.needs_review, ...(overLimit ? [] : modelNeedsReview)];
      const heldBack = [
        ...heldBackBefore,
        ...(overLimit
          ? [
              {
                reason: `The model would remove ${removals} items, more than the ${maxModelRemovals} one run may, so none of its changes were made.`,
                changes: [...modelChanges, ...modelNeedsReview].slice(
                  0,
                  MAX_MAINTENANCE_LISTED_CHANGES
                ),
              },
            ]
          : []),
      ];
      const retriedIds = new Set(retried);
      const heldBackIds = [
        ...new Set(heldBack.flatMap((group) => group.changes.map(({ id }) => id))),
      ].filter((id) => !retriedIds.has(id));
      const output: RecordMaintenanceRunOutput = {
        reviewed,
        written,
        merged: countOf(changes, 'merged'),
        superseded: countOf(changes, 'superseded'),
        rewritten: countOf(changes, 'rewritten'),
        summarized: countOf(changes, 'summarized'),
        tombstoned: countOf(changes, 'tombstoned'),
        needs_review: needsReview.length,
        rejected: rejected.length,
        held_back: heldBack.reduce((total, group) => total + group.changes.length, 0),
        changes: [...changes, ...needsReview],
        held_back_changes: heldBack,
        held_back_ids: heldBackIds.slice(0, MAX_MAINTENANCE_RETRY_IDS),
      };
      logger.debug(
        `Memory maintenance of AI index '${aiIndexId}' (${mode}) reviewed ${reviewed} items, changed ${changes.length} and held back ${output.held_back}`
      );
      return { output };
    },
  });
