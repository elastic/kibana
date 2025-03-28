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
import { concatenateChatCompletionChunks, Message, MessageRole } from '../../../common';
import type { FunctionCallChatFunction } from '../../service/types';
import { parseSuggestionScores } from './parse_suggestion_scores';
import { RecalledSuggestion } from './recall_and_score';
import { ShortIdTable } from '../../../common/utils/short_id_table';

const scoreFunctionRequestRt = t.type({
  message: t.type({
    function_call: t.type({
      name: t.literal('score'),
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
  userPrompt,
  userMessageFunctionName,
  context,
  chat,
  signal,
  logger,
}: {
  suggestions: RecalledSuggestion[];
  messages: Message[];
  userPrompt: string;
  userMessageFunctionName?: string;
  context: string;
  chat: FunctionCallChatFunction;
  signal: AbortSignal;
  logger: Logger;
}): Promise<{
  relevantDocuments: RecalledSuggestion[];
  llmScores: Array<{ id: string; llmScore: number }>;
}> {
  const shortIdTable = new ShortIdTable();

  const newUserMessageContent =
    dedent(`Given the following prompt, score the documents that are relevant to the prompt on a scale from 0 to 7,
    0 being completely irrelevant, and 7 being extremely relevant. Information is relevant to the prompt if it helps in
    answering the prompt. Judge the document according to the following criteria:
    
    - The document is relevant to the prompt, and the rest of the conversation
    - The document has information relevant to the prompt that is not mentioned, or more detailed than what is available in the conversation
    - The document has a high amount of information relevant to the prompt compared to other documents
    - The document contains new information not mentioned before in the conversation or provides a correction to previously stated information.
    
    User prompt:
    ${userPrompt}

    Context:
    ${context}

    Documents:
    ${JSON.stringify(
      suggestions.map((suggestion) => ({
        ...omit(suggestion, 'esScore'), // Omit ES score to not bias the LLM
        id: shortIdTable.take(suggestion.id), // Shorten id to save tokens
      })),
      null,
      2
    )}`);

  const newUserMessage: Message = {
    '@timestamp': new Date().toISOString(),
    message: {
      role: MessageRole.User,
      content: userMessageFunctionName
        ? JSON.stringify(newUserMessageContent)
        : newUserMessageContent,
      ...(userMessageFunctionName ? { name: userMessageFunctionName } : {}),
    },
  };

  const scoreFunction = {
    name: 'score',
    description:
      'Use this function to score documents based on how relevant they are to the conversation.',
    parameters: {
      type: 'object',
      properties: {
        scores: {
          description: `The document IDs and their scores, as CSV. Example:

            my_id,7
            my_other_id,3
            my_third_id,4
          `,
          type: 'string',
        },
      },
      required: ['scores'],
    } as const,
  };

  const response = await lastValueFrom(
    chat('score_suggestions', {
      messages: [...messages.slice(0, -2), newUserMessage],
      functions: [scoreFunction],
      functionCall: 'score',
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

  const suggestionIds = suggestions.map((document) => document.id);

  // get top 5 documents ids with scores > 4
  const relevantDocumentIds = llmScores
    .filter(({ llmScore }) => llmScore > 4)
    .sort((a, b) => b.llmScore - a.llmScore)
    .slice(0, 5)
    .filter(({ id }) => suggestionIds.includes(id ?? '')) // Remove hallucinated documents
    .map(({ id }) => id);

  const relevantDocuments = suggestions.filter((suggestion) =>
    relevantDocumentIds.includes(suggestion.id)
  );

  logger.debug(() => `Relevant documents: ${JSON.stringify(relevantDocuments, null, 2)}`);

  return {
    relevantDocuments,
    llmScores: llmScores.map((score) => ({ id: score.id, llmScore: score.llmScore })),
  };
}
