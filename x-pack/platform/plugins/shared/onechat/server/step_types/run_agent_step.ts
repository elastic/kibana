/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneChatDefaultAgentId } from '@kbn/onechat-common';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  runAgentStepCommonDefinition,
  type RunAgentStepInput,
} from '../../common/step_types/run_agent_step';
import { onechatStepServices } from './step_services';

/**
 * Server step definition for the onechat.runAgent step.
 * This step executes an onechat agent using the internal runner service.
 */
export const runAgentStepDefinition = createServerStepDefinition({
  ...runAgentStepCommonDefinition,
  handler: async (context) => {
    try {
      const { agent_id: agentId, message, schema } = context.input as RunAgentStepInput;

      context.logger.debug('onechat.runAgent step started');
      const request = context.contextManager.getFakeRequest();
      if (!request) {
        throw new Error('No request available in workflow context');
      }

      context.logger.debug('Executing onechat.runAgent step', {
        agentId: agentId || oneChatDefaultAgentId,
      });

      const runner = onechatStepServices.getRunner();

      const { result } = await runner.runAgent({
        agentId: agentId || oneChatDefaultAgentId,
        request,
        abortSignal: context.abortSignal,
        agentParams: {
          structuredOutput: !!schema,
          outputSchema: schema ? JSON.parse(schema) : undefined,
          nextInput: {
            message,
          },
        },
      });

      context.logger.debug('onechat.runAgent step completed successfully');

      const outputMessage = schema
        ? result.round.response.structured_output
        : result.round.response.message ?? '';

      return { output: outputMessage },
      };
    } catch (error) {
      context.logger.error(
        'onechat.runAgent step failed',
        error instanceof Error ? error : new Error(String(error))
      );
      return {
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
});
