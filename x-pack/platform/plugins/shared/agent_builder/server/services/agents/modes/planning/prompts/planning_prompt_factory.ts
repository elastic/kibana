/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { Plan } from '@kbn/agent-builder-common';
import type {
  PromptFactory,
  ResearchAgentPromptRuntimeParams,
  AnswerAgentPromptRuntimeParams,
} from '../../default/prompts/types';
import { convertPreviousRounds } from '../../utils/to_langchain_messages';
import {
  formatResearcherActionHistory,
  formatAnswerActionHistory,
} from '../../default/prompts/utils/actions';
import type { ProcessedConversation } from '../../utils/prepare_conversation';

const PLANNING_SYSTEM_PROMPT = `You are an AI planning assistant for Elastic's Agent Builder. You are in **planning mode**.

## Your Role
Your job is to create a structured, actionable plan for the user's request. You do NOT execute any actions — you only plan.

## Planning Protocol
1. **Understand the request**: Analyze what the user wants to accomplish.
2. **Discover capabilities**: Use \`planning.list_available_tools\` to see what tools are available, and read skill content to understand what skills exist. Use this knowledge to create a more informed plan.
3. **Create the plan**: Use \`planning.create_plan\` to create a structured plan with clear, ordered action items.
4. **Refine as needed**: If the user asks for changes, use \`planning.update_plan\` to modify the plan.
5. **Mark ready**: When the plan is finalized, update the plan status to 'ready'.

## Guidelines
- Each action item should be specific and actionable.
- If an action item relies on a specific tool or skill, include it in the \`related_tools\` or \`related_skills\` fields.
- Keep the plan concise — avoid overly granular steps.
- Ask clarifying questions if the user's request is ambiguous.
- You MUST NOT execute any tools that would change data or perform actions. Only use planning tools and discovery tools.
- After creating the plan, explain it to the user in a conversational way.`;

const formatExistingPlan = (plan: Plan): string => {
  const items = plan.action_items
    .map(
      (item, i) =>
        `  ${i}. [${item.status}] ${item.description}${
          item.related_tools?.length ? ` (tools: ${item.related_tools.join(', ')})` : ''
        }${item.related_skills?.length ? ` (skills: ${item.related_skills.join(', ')})` : ''}`
    )
    .join('\n');

  return `\n\n## Current Plan State
Title: ${plan.title}
Status: ${plan.status}
Source: ${plan.source}
${plan.description ? `Description: ${plan.description}` : ''}
Action Items:
${items}`;
};

export const createPlanningPromptFactory = ({
  existingPlan,
  processedConversation,
}: {
  existingPlan?: Plan;
  processedConversation: ProcessedConversation;
}): PromptFactory => {
  const systemPrompt = existingPlan
    ? PLANNING_SYSTEM_PROMPT + formatExistingPlan(existingPlan)
    : PLANNING_SYSTEM_PROMPT;

  return {
    getMainPrompt: async ({ actions }: ResearchAgentPromptRuntimeParams) => {
      const previousRoundsAsMessages = await convertPreviousRounds({
        conversation: processedConversation,
      });

      const messages: BaseMessageLike[] = [
        ['system', systemPrompt],
        ...previousRoundsAsMessages,
        ...formatResearcherActionHistory({ actions }),
      ];
      return messages;
    },
    getAnswerPrompt: async ({ actions, answerActions }: AnswerAgentPromptRuntimeParams) => {
      const previousRoundsAsMessages = await convertPreviousRounds({
        conversation: processedConversation,
        ignoreSteps: true,
      });

      const messages: BaseMessageLike[] = [
        ['system', systemPrompt],
        ...previousRoundsAsMessages,
        ...formatResearcherActionHistory({ actions }),
        ...formatAnswerActionHistory({ actions: answerActions }),
      ];
      return messages;
    },
    getStructuredAnswerPrompt: async ({
      actions,
      answerActions,
    }: AnswerAgentPromptRuntimeParams) => {
      const previousRoundsAsMessages = await convertPreviousRounds({
        conversation: processedConversation,
        ignoreSteps: true,
      });

      const messages: BaseMessageLike[] = [
        ['system', systemPrompt],
        ...previousRoundsAsMessages,
        ...formatResearcherActionHistory({ actions }),
        ...formatAnswerActionHistory({ actions: answerActions }),
      ];
      return messages;
    },
  };
};
