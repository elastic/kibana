/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { ServiceManager } from '../services';
import { runAgentStepCommonDefinition } from '../../common/step_types/run_agent_step';

/**
 * Server step definition for the "ai.agent" step.
 * This step executes an agentBuilder agent using the internal runner service.
 */
export const getRunAgentStepDefinition = (serviceManager: ServiceManager) => {
  return createServerStepDefinition({
    ...runAgentStepCommonDefinition,
    handler: async (context) => {
      try {
        const { message, schema } = context.input;
        const { 'agent-id': agentId, 'connector-id': connectorId } = context.config;

        context.logger.debug('ai.agent step started');
        const request = context.contextManager.getFakeRequest();
        if (!request) {
          throw new Error('No request available in workflow context');
        }

        context.logger.debug('Executing ai.agent step', {
          agentId: agentId || agentBuilderDefaultAgentId,
        });

        const runner = serviceManager.internalStart?.runnerFactory?.getRunner();
        if (!runner) {
          throw new Error('agent runner is not available');
        }

        const { result } = await runner.runAgent({
          agentId: agentId || agentBuilderDefaultAgentId,
          defaultConnectorId: connectorId,
          request,
          abortSignal: context.abortSignal,
          agentParams: {
            structuredOutput: !!schema,
            outputSchema: schema,
            nextInput: {
              message,
            },
          },
        });

        context.logger.debug('ai.agent step completed successfully');

        const outputMessage = schema
          ? JSON.stringify(result.round.response.structured_output)
          : result.round.response.message;

        return {
          output: {
            message: outputMessage,
            structured_output: result.round.response.structured_output,
          },
        };
      } catch (error) {
        context.logger.error(
          'agentBuilder.runAgent step failed',
          error instanceof Error ? error : new Error(String(error))
        );
        return {
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },
  });
};
