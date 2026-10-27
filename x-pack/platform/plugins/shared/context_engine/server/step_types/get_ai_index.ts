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

        const aiIndex = await getAiIndexService().get(context.input.ai_index_id, spaceId);
        return {
          output: {
            id: aiIndex.id,
            ...(aiIndex.description !== undefined && { description: aiIndex.description }),
            managed: aiIndex.managed,
            memory_enabled: aiIndex.memory_enabled,
            dest: aiIndex.dest,
            traces: aiIndex.traces,
          },
        };
      } catch (error) {
        throw toStepError(error, 'Failed to read AI index');
      }
    },
  });
