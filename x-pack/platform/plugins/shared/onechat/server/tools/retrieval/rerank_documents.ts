/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { BaseMessageLike } from '@langchain/core/messages';
import { OnechatToolIds, OnechatToolTags } from '@kbn/onechat-common';
import type { RegisteredTool } from '@kbn/onechat-server';

const rerankDocumentsSchema = z.object({
  query: z.string().describe('Text query to rerank snippets by.'),
  documents: z
    .array(
      z.object({
        id: z.string().describe('ID of the document.'),
        index: z.string().optional().describe('Index the document is from, if applicable.'),
        snippet: z.string().describe('Text snippet to use for reranking.'),
      })
    )
    .min(1)
    .describe('Documents to rerank'),
});

export const rerankDocumentsTool = (): RegisteredTool<typeof rerankDocumentsSchema> => {
  return {
    id: OnechatToolIds.rerankDocuments,
    description: 'Score and rerank documents based their relevance against a text query.',
    schema: rerankDocumentsSchema,
    handler: async ({ query, documents }, { modelProvider }) => {
      const { chatModel } = await modelProvider.getDefaultModel();

      const rerankDocs = documents.map((doc) => ({
        id: doc.id,
        content: doc.snippet,
      }));

      const analysisModel = chatModel.withStructuredOutput(
        z.object({
          ratings: z
            .array(
              z.object({
                id: z.string().describe('ID of the document'),
                grade: z.number().describe('Score of the document, between 0 and 10'),
                reason: z
                  .string()
                  .optional()
                  .describe('Optional reason for the rating. Keep it short and concise.'),
              })
            )
            .describe('the ratings, one per document using the "{id, grade, reason}" format.'),
        })
      );

      const { ratings } = await analysisModel.invoke(
        getAnalysisPrompt({ query, documents: rerankDocs })
      );

      const ratingMap = ratings.reduce((acc, rating) => {
        acc[rating.id] = {
          grade: rating.grade,
        };
        return acc;
      }, {} as Record<string, any>);

      const documentsWithRatings = documents.map((doc) => ({
        ...doc,
        rating: ratingMap[doc.id] ?? 'n/a',
      }));

      return documentsWithRatings;
    },
    meta: {
      tags: [OnechatToolTags.retrieval],
    },
  };
};

interface RerankingDoc {
  id: string;
  content: unknown;
}

export const getAnalysisPrompt = ({
  query,
  documents,
}: {
  query: string;
  documents: RerankingDoc[];
}): BaseMessageLike[] => {
  const resultEntry = (document: RerankingDoc): string => {
    return `
    ### Document (ID: ${document.id})

    **Document ID:** "${document.id}"

    **Content:**
    \`\`\`
    ${JSON.stringify(document.content, null, 2)}
    \`\`\`
    `;
  };

  return [
    [
      'system',
      `
      ## Current task: Relevance Analysis

      Your task is to evaluate at set of documents in relation to the user’s query,
      and assign a relevance rating from 0 to 10 using the following criteria:
      - **0:** The document is completely irrelevant.
      - **5:** The document is somewhat related and might be useful.
      - **8:** The document is very relevant and contains useful information.
      - **10:** The document is absolutely crucial for answering the query.

      **Instructions:**
      - **Independent Ratings:** Rate each document independently based solely on its relevance to the provided query.
      - **Format:** Return your ratings as a JSON object with a "ratings" array, where each element follows the \`"{id}|{grade}"\` format. Example: \`{"ratings": ["0|7", "1|5", "2|10"]}\`.
      - **Document IDs:** Use the document IDs provided in this prompt, not any IDs contained in the document content.
      - **Optional Comments:** You may include an optional \`"comment"\` field with additional remarks on your ratings.

      ## Input

      ## Input

      You will receive:
      1. The search query from the user.
      2. A list of documents, each with an assigned document ID, that were retrieved in the previous step.
  `,
    ],
    [
      'human',
      `
    ## Input

    **Search Query:**: "${query}"

    ## Documents

    ${documents.map(resultEntry).join('\n')}
    `,
    ],
  ];
};
