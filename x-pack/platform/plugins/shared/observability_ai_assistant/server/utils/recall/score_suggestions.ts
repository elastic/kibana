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
import { concatenateChatCompletionChunks, Message, MessageRole } from '../../../common';
import type { FunctionCallChatFunction } from '../../service/types';
import { parseSuggestionScores } from './parse_suggestion_scores';
import { ShortIdTable } from '../../../common/utils/short_id_table';
import { KnowledgeBaseHit } from '../../service/knowledge_base_service/types';

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
  entries,
  messages,
  userPrompt,
  context,
  chat,
  signal,
  logger,
}: {
  entries: KnowledgeBaseHit[];
  messages: Message[];
  userPrompt: string;
  context: string;
  chat: FunctionCallChatFunction;
  signal: AbortSignal;
  logger: Logger;
}): Promise<{
  selected: string[];
  scores?: Map<string, number>;
}> {
  const shortIdTable = new ShortIdTable();

  const formattedEntries = entries.map((entry) => ({
    text: entry.truncated?.truncatedText ?? entry.text,
    truncated: !!entry.truncated,
    id: shortIdTable.take(entry.id), // Shorten id to save tokens
  }));

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
    \`\`\`json
    ${JSON.stringify(formattedEntries)}
    \`\`\`
    `);

  const newUserMessage: Message = {
    '@timestamp': new Date().toISOString(),
    message: {
      role: MessageRole.User,
      content: newUserMessageContent,
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

  const scores = parseSuggestionScores(scoresAsString)
    // Restore original IDs
    .map(({ shortId, score }) => ({ id: shortIdTable.lookup(shortId)!, score }));

  if (scores.length === 0) {
    // seemingly invalid or no scores, return all
    return {
      selected: entries.map((entry) => entry.id),
    };
  }

  const suggestionIds = entries.map((document) => document.id);

  // get top 5 documents ids with scores > 4
  const relevantDocumentIds = scores
    .filter(({ score }) => score > 4)
    .sort((a, b) => b.score - a.score)
    .filter(({ id }) => suggestionIds.includes(id ?? '')) // Remove hallucinated documents
    .slice(0, 10)
    .map(({ id }) => id);

  const selected = entries.filter((entry) => relevantDocumentIds.includes(entry.id));

  logger.debug(() => `Relevant documents: ${JSON.stringify(selected)}`);

  return {
    scores: new Map<string, number>(scores.map((score) => [score.id, score.score])),
    selected: relevantDocumentIds,
  };
}
