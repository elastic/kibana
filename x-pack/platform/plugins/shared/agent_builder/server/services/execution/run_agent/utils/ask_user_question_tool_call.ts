/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { internalTools } from '@kbn/agent-builder-common';
import type {
  AskUserQuestionAnswer,
  AskUserQuestionItem,
} from '@kbn/agent-builder-common/agents/prompts';

/**
 * Canonical wire shape of an "answered ask_user_question" tool call.
 *
 * Two call sites synthesize a tool-call / tool-response pair for an answered
 * ask_user_question step:
 *  - `pending_ask_user_question_steps_to_actions.ts` wraps the parts in
 *    `toolCallAction` + `executeToolAction` (action layer, current-round resume).
 *  - `to_langchain_messages.ts` wraps the parts in `AIMessage` + `ToolMessage`
 *    (message layer, prior-round conversion).
 *
 * Both layers see identical fields: tool name, args, serialized content,
 * artifact. This helper centralizes that shape so renames or field changes
 * touch one place.
 */
export interface AskUserQuestionToolCallParts {
  toolCallId: string;
  toolName: string;
  args: { questions: AskUserQuestionItem[] };
  artifact: { answers: AskUserQuestionAnswer[] };
  /** what the LLM reads as the tool result. */
  content: string;
}

export const materializeAskUserQuestionToolCall = ({
  questions,
  answers,
}: {
  questions: AskUserQuestionItem[];
  answers: AskUserQuestionAnswer[];
}): AskUserQuestionToolCallParts => ({
  toolCallId: uuidv4(),
  toolName: internalTools.askUserQuestion,
  args: { questions },
  content: JSON.stringify({ answers }),
  artifact: { answers },
});
