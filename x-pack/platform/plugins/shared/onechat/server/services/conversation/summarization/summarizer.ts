/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import { z } from '@kbn/zod';
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';
import type { Conversation } from '@kbn/onechat-common';
import type { ScopedModel } from '@kbn/onechat-server';
import { conversationToLangchainMessages } from '../../agents/modes/utils';
import type { SummaryStructuredData } from './types';

const structuredMemorySchema = z.object({
  title: z.string().describe("A concise, 5-10 word summary of the conversation's main topic."),
  user_intent: z
    .string()
    .describe(
      "A clear and concise statement describing what the user was trying to achieve in this conversation. Start with a verb, e.g., 'Debug a Python script that fails to connect to a database'."
    ),
  overall_summary: z
    .string()
    .describe(
      'A brief, 2-6 sentence narrative summary of the entire conversation. Capture the main goal and the result.'
    ),
  key_topics: z
    .array(z.string())
    .describe(
      "An array of strings representing the primary subjects discussed, e.g., 'API authentication', 'data visualization', 'bug fixing'."
    ),
  outcomes_and_decisions: z
    .array(z.string())
    .describe(
      "An array of strings, where each string is a key conclusion, resolution, or decision that was made. Be specific and factual. e.g., 'The connection issue was caused by an incorrect password in the config file.'"
    ),
  unanswered_questions: z
    .array(z.string())
    .describe(
      'An array of strings listing any important questions the user asked that were not fully resolved by the end of the conversation. May be left empty.'
    ),
  agent_actions: z
    .array(z.string())
    .describe(
      "An array of strings describing the specific actions the agent took, e.g., 'Ran a shell command', 'Searched the web for error codes', 'Wrote a Python script'. May be left empty."
    ),
});

const SYSTEM_PROMPT = `You are an expert AI assistant. Your task is to process a conversation transcript and extract key, factual information into the provided structured format. This information will be used for the agent's long-term memory. Analyze the conversation between the "user" and the "assistant" carefully and extract the requested information.

--- EXAMPLE ---
CONVERSATION:
user: "Hey, I'm trying to run the build.sh script but it's failing with a 'permission denied' error. Can you help?"
assistant: "It sounds like the script isn't executable. You can fix that by running 'chmod +x build.sh'. Try that and let me know if it works."
user: "That worked! Thanks."

YOUR OUTPUT:
{
  "title": "Fix 'permission denied' on build.sh script",
  "overall_summary": "User was unable to run a shell script due to a 'permission denied' error. The assistant identified the issue as a lack of execute permissions and provided the 'chmod +x' command to resolve it.",
  "key_topics": ["shell script", "file permissions", "chmod"],
  "entities": {
    "files": ["build.sh"],
    "people": [],
    "organizations": [],
    "dates": []
  },
  "user_intent": "Fix a 'permission denied' error when running a shell script.",
  "outcomes_and_decisions": [
    "The 'permission denied' error was resolved by making the script executable with 'chmod +x build.sh'."
  ],
  "unanswered_questions": [],
  "agent_actions": ["Provided a shell command to change file permissions."]
}
--- END OF EXAMPLE ---
`;

export const summarizeConversation = async ({
  conversation,
  model,
}: {
  conversation: Conversation;
  model: ScopedModel;
}): Promise<SummaryStructuredData> => {
  return withActiveInferenceSpan(
    'SummarizeConversation',
    { attributes: { [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN' } },
    async () => {
      const history = conversationToLangchainMessages({
        previousRounds: conversation.rounds,
        ignoreSteps: false,
        nextInput: {
          message: 'Now please generate a summary of the conversation.',
        },
      });

      const messages: BaseMessageLike[] = [['system', SYSTEM_PROMPT], ...history];

      const response = await model.chatModel
        .withStructuredOutput(structuredMemorySchema, { name: 'extract_info' })
        .invoke(messages);

      const {
        title,
        overall_summary: overallSummary,
        user_intent: userIntent,
        agent_actions: agentActions,
        key_topics: keyTopics,
        outcomes_and_decisions: outcomesAndDecisions,
        unanswered_questions: unansweredQuestions,
      } = response;

      return {
        title,
        discussion_summary: overallSummary,
        user_intent: userIntent,
        key_topics: keyTopics ?? [],
        outcomes_and_decisions: outcomesAndDecisions ?? [],
        unanswered_questions: unansweredQuestions ?? [],
        agent_actions: agentActions ?? [],
      };
    }
  );
};
