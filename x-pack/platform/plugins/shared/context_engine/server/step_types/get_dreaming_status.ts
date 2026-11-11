/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import {
  getDreamingStatusStepCommonDefinition,
  type GetDreamingStatusOutput,
} from '../../common/step_types/get_dreaming_status';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import { shouldDream } from '../dreaming/schedule';
import type { DreamingStepDependencies } from './helpers';

export const getDreamingStatusStepDefinition = ({
  getAiIndexService,
  isContextEngineEnabled,
  isMemoryEnabled,
  checkReadPrivilege,
}: DreamingStepDependencies) =>
  createServerStepDefinition({
    ...getDreamingStatusStepCommonDefinition,
    handler: async (context) => {
      const { spaceId } = context.contextManager.getContext().workflow;
      const { ai_index_id: aiIndexId, source = 'memories' } = context.input;
      if (!(await checkReadPrivilege(context.contextManager.getFakeRequest(), spaceId))) {
        throw new ExecutionError({
          type: 'PermissionError',
          message: 'Insufficient privileges to read AI indices',
        });
      }
      const skip = (reason: string): { output: GetDreamingStatusOutput } => ({
        output: { dream: false, reason },
      });

      if (!(await isContextEngineEnabled(spaceId))) {
        return skip('Context Engine is turned off in this space.');
      }
      if (!(await isMemoryEnabled())) {
        return skip('The global Context Engine memory setting is off.');
      }
      try {
        const aiIndex = await getAiIndexService().get(aiIndexId, spaceId);
        if (!shouldDream(aiIndex)) {
          return skip(`Dreaming is not turned on for AI index '${aiIndexId}'.`);
        }
        if (source === 'traces' && aiIndex.traces.length === 0) {
          return skip(`AI index '${aiIndexId}' has no trace sources to dream on.`);
        }
      } catch (error) {
        if (error instanceof AiIndexNotFoundError) {
          return skip(`AI index '${aiIndexId}' does not exist.`);
        }
        throw error;
      }
      return { output: { dream: true } };
    },
  });
