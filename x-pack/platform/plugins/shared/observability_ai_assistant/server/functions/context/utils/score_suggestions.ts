/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { Logger } from '@kbn/logging';
import dedent from 'dedent';
import { lastValueFrom } from 'rxjs';
import { decodeOrThrow, jsonRt } from '@kbn/io-ts-utils';
import { omit } from 'lodash';
import { concatenateChatCompletionChunks, Message, MessageRole } from '../../../../common';
import type { FunctionCallChatFunction } from '../../../service/types';
import { parseSuggestionScores } from './parse_suggestion_scores';
import { RecalledSuggestion } from './recall_and_score';
import { ShortIdTable } from '../../../../common/utils/short_id_table';
import { getLastUserMessage } from './get_last_user_message';

export const SCORE_SUGGESTIONS_FUNCTION_NAME = 'score_suggestions';

const scoreFunctionRequestRt = t.type({
  message: t.type({
    function_call: t.type({
      name: t.literal(SCORE_SUGGESTIONS_FUNCTION_NAME),
      arguments: t.string,
    }),
  }),
});

const scoreFunctionArgumentsRt = t.type({
  scores: t.string,
});

export async function scoreSuggestions({
  suggestions,
  messages,
  screenDescription,
  chat,
  signal,
  logger,
}: {
  suggestions: RecalledSuggestion[];
  messages: Message[];
  screenDescription: string;
  chat: FunctionCallChatFunction;
  signal: AbortSignal;
  logger: Logger;
}): Promise<{
  relevantDocuments: RecalledSuggestion[];
  llmScores: Array<{ id: string; llmScore: number }>;
}> {
  const shortIdTable = new ShortIdTable();
  const userPrompt = getLastUserMessage(messages);

  const scoreFunction = {
    name: SCORE_SUGGESTIONS_FUNCTION_NAME,
    description: `Scores documents for relevance based on the user's prompt, conversation history, and screen context.`,
    parameters: {
      type: 'object',
      properties: {
        scores: {
          description: `A CSV string of document IDs and their integer scores (0-7). One per line, with no header. Example:
            my_id,7
            my_other_id,3
            my_third_id,0
          `,
          type: 'string',
        },
      },
      required: ['scores'],
    } as const,
  };

  const response = await lastValueFrom(
    chat('score_suggestions', {
      systemMessage: dedent(`You are a Document Relevance Scorer.
        Your sole task is to compare each *document* in <DocumentsToScore> against three sources of context:

        1.  **<UserPrompt>** - what the user is asking right now.
        2.  **<ConversationHistory>** - the ongoing dialogue (including earlier assistant responses).
        3.  **<ScreenDescription>** - what the user is currently looking at in the UI.

        For every document you must assign one integer score from 0 to 7 (inclusive) that answers the question
        “*How helpful is this document for the user's current need, given their prompt <UserPrompt>, conversation history <ConversationHistory> and screen description <ScreenDescription>?*”

        ### Scoring rubric
        Use the following scale to assign a score to each document. Be critical and consistent.
        - **7:** Directly and completely answers the user's current need; almost certainly the top answer. 
        - **5-6:** Highly relevant; addresses most aspects of the prompt or clarifies a key point. 
        - **3-4:** Somewhat relevant; tangential, partial answer, or needs other docs to be useful. 
        - **1-2:** Barely relevant; vague thematic overlap only. 
        - **0:** Irrelevant; no meaningful connection.

        ### Mandatory rules
        1.  **Base every score only on the text provided**. Do not rely on outside knowledge.
        2.  **Never alter, summarise, copy, or quote the documents**. Your output is *only* the scores.
        3.  **Return the result exclusively by calling the provided function** \`${SCORE_SUGGESTIONS_FUNCTION_NAME}\`.
            * Populate the single argument 'scores' with a CSV string.
            * Format: '<documentId>,<score>' - one line per document, no header, no extra whitespace.
        4.  **Do not output anything else** (no explanations, no JSON wrappers, no markdown). The function call itself is the entire response.

        If you cannot parse any part of the input, still score whatever you can and give obviously unparsable docs a 0.

        ---
        CONTEXT AND DOCUMENTS TO SCORE
        ---

        <UserPrompt>
        ${userPrompt}
        </UserPrompt>

        <ConversationHistory>
        ${JSON.stringify(messages, null, 2)}
        </ConversationHistory>

        <ScreenDescription>
        ${screenDescription}
        </ScreenDescription>

        <DocumentsToScore>
        ${JSON.stringify(
          suggestions.map((suggestion) => ({
            ...omit(suggestion, 'esScore'), // Omit ES score to not bias the LLM
            id: shortIdTable.take(suggestion.id), // Shorten id to save tokens
          })),
          null,
          2
        )}
        </DocumentsToScore>`),
      messages: [
        {
          '@timestamp': new Date().toISOString(),
          message: {
            role: MessageRole.User,
            content: userPrompt,
          },
        },
      ],
      functions: [scoreFunction],
      functionCall: SCORE_SUGGESTIONS_FUNCTION_NAME,
      signal,
      stream: true,
    }).pipe(concatenateChatCompletionChunks())
  );

  const scoreFunctionRequest = decodeOrThrow(scoreFunctionRequestRt)(response);
  const { scores: scoresAsString } = decodeOrThrow(jsonRt.pipe(scoreFunctionArgumentsRt))(
    scoreFunctionRequest.message.function_call.arguments
  );

  const llmScores = parseSuggestionScores(scoresAsString)
    // Restore original IDs (added fallback to id for testing purposes)
    .map(({ id, llmScore }) => ({ id: shortIdTable.lookup(id) || id, llmScore }));

  if (llmScores.length === 0) {
    // seemingly invalid or no scores, return all
    return { relevantDocuments: suggestions, llmScores: [] };
  }

  // get top 5 documents ids
  const relevantDocuments = llmScores
    .filter(({ llmScore }) => llmScore > 4)
    .sort((a, b) => b.llmScore - a.llmScore)
    .slice(0, 5)
    .map(({ id, llmScore }) => {
      const suggestion = suggestions.find((doc) => doc.id === id);
      if (!suggestion) {
        return; // remove hallucinated documents
      }

      return {
        id,
        llmScore,
        esScore: suggestion.esScore,
        text: suggestion.text,
      };
    })
    .filter(filterNil);

  logger.debug(() => `Relevant documents: ${JSON.stringify(relevantDocuments, null, 2)}`);

  return {
    relevantDocuments,
    llmScores: llmScores.map((score) => ({ id: score.id, llmScore: score.llmScore })),
  };
}

function filterNil<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}
