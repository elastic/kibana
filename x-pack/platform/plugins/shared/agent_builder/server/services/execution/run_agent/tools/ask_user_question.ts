/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { AgentExecutionMode, ToolType, internalTools } from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';

export const AskUserQuestionToolName = internalTools.askUserQuestion;

const optionSchema = z.object({
  label: z.string().describe('Short label shown on the option button.'),
  description: z.string().optional().describe('Optional longer description for the option.'),
});

const questionSchema = z.object({
  question: z.string().describe('The question text shown to the user.'),
  options: z.array(optionSchema).describe('The selectable options. Provide 2 to 4 options.'),
  multi_select: z.boolean().describe('When true the user can pick more than one option.'),
});

const schema = z.object({
  questions: z
    .array(questionSchema)
    .describe(
      '1 to 5 multi-choice questions to ask the user. The user may also skip a question, or pick "other" and enter free text.'
    ),
});

const description = `Ask the user 1 to 5 multiple-choice clarifying questions and pause execution until they answer.

## When to use
- The user's request is ambiguous AND the missing information cannot be inferred from the conversation or other tools.
- You need a small, bounded set of choices to disambiguate (NOT an open-ended brainstorm).

## When NOT to use
- The user already provided the information earlier in the conversation. Re-read instead of asking again.
- You can answer the question yourself with the tools available.
- The answer would require free-form text longer than a sentence. Use plain conversation for that.

## Schema soft limits (enforced socially, not by the schema)
- 1 to 5 questions per call.
- 2 to 4 options per question.

## Call shape
- Do NOT call this tool in parallel with itself.
- Avoid calling it in parallel with other tools. If you must, the runner will still surface every HITL prompt at once, but a follow-up answer round will be required before the rest of the conversation can proceed.

## Standalone runs
- This tool is unavailable in standalone / sub-agent executions. It returns an error result there; do not retry.`;

export const createAskUserQuestionTool = (): BuiltinToolDefinition<typeof schema> => {
  return {
    id: AskUserQuestionToolName,
    description,
    type: ToolType.builtin,
    schema,
    tags: ['system'],
    handler: async ({ questions }, ctx) => {
      if (ctx.executionMode === AgentExecutionMode.standalone) {
        return {
          results: [
            createErrorResult(
              'ask_user_question is not available in standalone or sub-agent mode (no interactive user).'
            ),
          ],
        };
      }

      const stepId = uuidv4();
      return {
        prompt: {
          type: AgentPromptType.ask_user_question,
          id: stepId,
          questions,
        },
      };
    },
  };
};
