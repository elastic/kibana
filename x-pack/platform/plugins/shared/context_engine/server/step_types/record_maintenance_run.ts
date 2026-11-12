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
import type { MaintenanceChange } from '../../common/step_types/gather_maintenance';
import type { DreamingKiStepDependencies } from './helpers';

const countOf = (changes: MaintenanceChange[], change: MaintenanceChange['change']): number =>
  changes.filter((candidate) => candidate.change === change).length;

export const getRecordMaintenanceRunStepDefinition = ({
  analyticsService,
  logger,
}: Pick<DreamingKiStepDependencies, 'analyticsService' | 'logger'>) =>
  createServerStepDefinition({
    ...recordMaintenanceRunStepCommonDefinition,
    handler: async (context) => {
      const {
        ai_index_id: aiIndexId,
        mode,
        braked = false,
        reviewed,
        written,
        changes,
        needs_review: needsReview,
        rejected,
      } = context.input;
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
      };
      analyticsService.reportMemoryMaintenanceRun({
        ai_index_id: aiIndexId,
        mode,
        braked,
        ...output,
      });
      logger.debug(
        `Memory maintenance of AI index '${aiIndexId}' (${mode}${
          braked ? ', braked' : ''
        }) reviewed ${reviewed} items and changed ${changes.length}`
      );
      return { output };
    },
  });
