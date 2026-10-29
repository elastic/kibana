/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { getAiIndexStepCommonDefinition } from '../../common/step_types/get_ai_index';
import type { AiIndexStepDependencies } from './helpers';
import { assertContextEngineEnabled, assertKiReadPrivilege } from './helpers';
import { toStepError } from './to_step_error';
import { buildTraceQueries } from '../ai_indices/trace_queries';

export const getGetAiIndexStepDefinition = ({
  getAiIndexService,
  isContextEngineEnabled,
  checkReadPrivilege,
}: AiIndexStepDependencies) =>
  createServerStepDefinition({
    ...getAiIndexStepCommonDefinition,
    handler: async (context) => {
      try {
        const request = context.contextManager.getFakeRequest();
        const { spaceId } = context.contextManager.getContext().workflow;
        await assertContextEngineEnabled(isContextEngineEnabled, spaceId);
        await assertKiReadPrivilege(checkReadPrivilege, request, spaceId);

        const { ai_index_id: aiIndexId, traces_since_hours: tracesSinceHours } = context.input;
        const aiIndex = await getAiIndexService().get(aiIndexId, spaceId);
        return {
          output: {
            id: aiIndex.id,
            ...(aiIndex.description !== undefined && { description: aiIndex.description }),
            managed: aiIndex.managed,
            memory_enabled: aiIndex.memory_enabled,
            dest: aiIndex.dest,
            sources: aiIndex.sources,
            traces:
              tracesSinceHours === undefined
                ? aiIndex.traces
                : buildTraceQueries(
                    aiIndex.traces.map(({ type, value }) => ({ type, value })),
                    spaceId,
                    tracesSinceHours
                  ),
          },
        };
      } catch (error) {
        throw toStepError(error, 'Failed to read AI index');
      }
    },
  });
