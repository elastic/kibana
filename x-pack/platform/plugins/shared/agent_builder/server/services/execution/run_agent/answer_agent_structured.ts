/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { AgentEventEmitter } from '@kbn/agent-builder-server';
import { createReasoningEvent } from '@kbn/agent-builder-genai-utils/langchain';
import { wrapJsonSchema } from '@kbn/agent-builder-genai-utils/tools/utils/json_schema';
import type { Logger } from '@kbn/logging';
import type { AgentBuilderAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import { convertError, isRecoverableError } from './utils/errors';
import type { PromptFactory } from './prompts';
import { getRandomAnsweringMessage } from './i18n';
import { tags } from './constants';
import type { StateType, StateUpdate } from './state';
import { processStructuredAnswerResponse } from './response_processing';
import { countNonTodosSteps } from './step_state';

const structuredOutputZodSchema = z.object({
  response: z.string().describe("The response to the user's query"),
  data: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Optional structured data to include in the response'),
});

const { $schema: _$schema, ...structuredOutputSchema } = z.toJSONSchema(structuredOutputZodSchema, {
  io: 'input',
  unrepresentable: 'any',
}) as Record<string, unknown>;

export { structuredOutputSchema };

const wrappedSchemaProp = 'response';

/**
 * Structured output answer agent with structured error handling.
 * This agent uses structured output mode and returns structured error responses.
 */
export const createAnswerAgentStructured = ({
  chatModel,
  promptFactory,
  events,
  outputSchema,
}: {
  chatModel: InferenceChatModel;
  events: AgentEventEmitter;
  promptFactory: PromptFactory;
  outputSchema?: Record<string, unknown>;
  logger: Logger;
}) => {
  return async (state: StateType): Promise<StateUpdate> => {
    if (state.answerOutcome === undefined && state.errorCount === 0) {
      events.emit(createReasoningEvent(getRandomAnsweringMessage(), { transient: true }));
    }

    const retryUpdate = (error: AgentBuilderAgentExecutionError): StateUpdate => ({
      answerOutcome: { type: 'retry_error', error },
      errorCount: state.errorCount + 1,
      retryNotices: [
        { phase: 'answer', afterNonTodosStepCount: countNonTodosSteps(state.steps), error },
      ],
    });

    try {
      const { schema: schemaToUse, wrapped } = wrapJsonSchema({
        schema: outputSchema ?? structuredOutputSchema,
        property: wrappedSchemaProp,
        description:
          "Use this structured format to respond to the user's request with the required data.",
      });

      const structuredModel = chatModel
        .withStructuredOutput(schemaToUse, {
          name: 'structured_answer',
        })
        .withConfig({
          tags: [tags.agent, tags.answerAgent],
        });

      const handover =
        state.researchOutcome?.type === 'handover' ? state.researchOutcome : undefined;
      const prompt = await promptFactory.getStructuredAnswerPrompt({
        cycleLimit: state.cycleLimit,
        steps: state.steps,
        renderState: state.toolRenderState,
        pendingToolCallIds: state.pendingToolCallIds,
        retryNotices: state.retryNotices,
        handover: handover ? { message: handover.message, forceful: handover.forceful } : undefined,
      });

      let response = await structuredModel.invoke(prompt);
      // unwrap response if schema was wrapped
      if (wrapped && response[wrappedSchemaProp]) {
        response = response[wrappedSchemaProp];
      }

      const outcome = processStructuredAnswerResponse(response);
      if (outcome.type === 'retry_error') {
        // Successful inference calls can still produce recoverable errors,
        // which must count toward the retry limit.
        return retryUpdate(outcome.error);
      }

      return { answerOutcome: outcome, errorCount: 0 };
    } catch (error) {
      const executionError = convertError(error);
      if (isRecoverableError(executionError)) {
        return retryUpdate(executionError);
      } else {
        throw executionError;
      }
    }
  };
};
