/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ResolvedAgentCapabilities } from '@kbn/agent-builder-common';
import type { AgentEventEmitter } from '@kbn/agent-builder-server';
import { createReasoningEvent } from '@kbn/agent-builder-genai-utils/langchain';
import { wrapJsonSchema } from '@kbn/agent-builder-genai-utils/tools/utils/json_schema';
import type { Logger } from '@kbn/logging';
import type { ProcessedAttachmentType } from '../utils/prepare_conversation';
import type { AttachmentPresentation } from '../utils/attachment_presentation';
import type { ResolvedConfiguration } from '../types';
import { convertError, isRecoverableError } from '../utils/errors';
import { errorAction } from './actions';
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

const wrappedSchemaProp = 'response';

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
  attachmentTypes,
  versionedAttachmentPresentation,
}: {
  chatModel: InferenceChatModel;
  configuration: ResolvedConfiguration;
  capabilities: ResolvedAgentCapabilities;
  events: AgentEventEmitter;
  outputSchema?: Record<string, unknown>;
  logger: Logger;
  attachmentTypes: ProcessedAttachmentType[];
  versionedAttachmentPresentation?: AttachmentPresentation;
}) => {
  return async (state: StateType) => {
    if (state.answerActions.length === 0 && state.errorCount === 0) {
      events.emit(createReasoningEvent(getRandomAnsweringMessage(), { transient: true }));
    }
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

      const prompt = getStructuredAnswerPrompt({
        customInstructions: configuration.answer.instructions,
        capabilities,
        initialMessages: state.initialMessages,
        conversationTimestamp: state.conversationTimestamp,
        actions: state.mainActions,
        answerActions: state.answerActions,
        attachmentTypes,
        versionedAttachmentPresentation,
      });

      let response = await structuredModel.invoke(prompt);
      // unwrap response if schema was wrapped
      if (wrapped && response[wrappedSchemaProp]) {
        response = response[wrappedSchemaProp];
      }

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
