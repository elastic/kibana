/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { AgentExecutionMode, ChatTriggerMode } from '@kbn/agent-builder-common';
import {
  addUserMessageStepCommonDefinition,
  type AddUserMessageInputSchema,
} from '../../../common/workflows/steps/add_user_message';
import { normalizeOptionalStringParam } from '../../../common/normalize_optional_string_param';
import type { ConversationStepDeps } from '../registry';

export const addUserMessageStepDefinition = ({ getExecutionService }: ConversationStepDeps) =>
  createServerStepDefinition({
    ...addUserMessageStepCommonDefinition,
    handler: async (context: StepHandlerContext<AddUserMessageInputSchema>) => {
      try {
        const request = context.contextManager.getFakeRequest();

        const {
          conversation_id: conversationId,
          message,
          author_name: authorNameRaw,
        } = context.input;
        const authorName = normalizeOptionalStringParam(authorNameRaw);

        await getExecutionService().maybeExecuteAgent({
          mode: AgentExecutionMode.conversation,
          request,
          params: {
            conversationId,
            nextInput: { message },
            triggerMode: ChatTriggerMode.Never,
            ...(authorName ? { author: { full_name: authorName } } : {}),
          },
        });

        return { output: { conversation_id: conversationId } };
      } catch (error) {
        return { error };
      }
    },
  });
