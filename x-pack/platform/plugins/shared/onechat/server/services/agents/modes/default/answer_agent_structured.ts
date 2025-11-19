/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ResolvedAgentCapabilities } from '@kbn/onechat-common';
import type { AgentEventEmitter } from '@kbn/onechat-server';
import { createReasoningEvent } from '@kbn/onechat-genai-utils/langchain';
import type { Logger } from '@kbn/logging';
import { errorAction } from './actions';
import type { ResolvedConfiguration } from '../types';
import { convertError, isRecoverableError } from '../utils/errors';
import { getStructuredAnswerPrompt } from './prompts';
import { getRandomAnsweringMessage } from './i18n';
import { tags } from './constants';
import type { StateType } from './state';
import { processStructuredAnswerResponse } from './action_utils';

export const structuredOutputSchema = z.object({
  response: z.string().describe("The response to the user's query"),
  data: z
    .record(z.unknown())
    .optional()
    .describe('Optional structured data to include in the response'),
});

/**
 * Structured output answer agent with structured error handling.
 * This agent uses structured output mode and returns structured error responses.
 */
export const createAnswerAgentStructured = ({
  chatModel,
  configuration,
  capabilities,
  events,
  outputSchema,
  logger,
}: {
  chatModel: InferenceChatModel;
  configuration: ResolvedConfiguration;
  capabilities: ResolvedAgentCapabilities;
  events: AgentEventEmitter;
  outputSchema?: Record<string, unknown>;
  logger: Logger;
}) => {
  return async (state: StateType) => {
    if (state.answerActions.length === 0 && state.errorCount === 0) {
      events.emit(createReasoningEvent(getRandomAnsweringMessage(), { transient: true }));
    }
    try {
      let schemaToUse = outputSchema
        ? (outputSchema as Record<string, any>)
        : structuredOutputSchema;

      // Add description to JSON Schema if it doesn't have one, for some reason without it this doesnt seem to work reliably
      if (
        !('description' in schemaToUse) &&
        typeof schemaToUse === 'object' &&
        schemaToUse !== null
      ) {
        schemaToUse = {
          ...schemaToUse,
          description:
            "Use this structured format to respond to the user's request with the required data.",
        };
      }

      const structuredModel = chatModel
        .withStructuredOutput(schemaToUse, {
          name: 'structured_response',
        })
        .withConfig({
          tags: [tags.agent, tags.answerAgent],
        });

      const prompt = getStructuredAnswerPrompt({
        customInstructions: configuration.answer.instructions,
        capabilities,
        initialMessages: state.initialMessages,
        actions: state.mainActions,
        answerActions: state.answerActions,
      });

      const response = await structuredModel.invoke(prompt);
      const action = processStructuredAnswerResponse(response);

      return {
        answerActions: [action],
        errorCount: 0,
      };
    } catch (error) {
      const executionError = convertError(error);
      if (isRecoverableError(executionError)) {
        return {
          answerActions: [errorAction(executionError)],
          errorCount: state.errorCount + 1,
        };
      } else {
        throw executionError;
      }
    }
  };
};
