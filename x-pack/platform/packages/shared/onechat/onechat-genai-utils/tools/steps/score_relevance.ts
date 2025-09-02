/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BaseMessageLike } from '@langchain/core/messages';
import type { ScopedModel } from '@kbn/onechat-server';

/**
 * Relevance score
 */
export enum RelevanceScore {
  /**
   * The resource has no connection to the query.
   * It does not contain any relevant information, keywords, or concepts.
   */
  Irrelevant = 0,
  /**
   * The resource mentions a keyword from the query but in a different context,
   * or it provides only a passing, trivial reference.
   * It is highly unlikely to be useful.
   */
  Tangential = 1,
  /**
   * The resource provides general context or background information on the query's topic
   * but does not directly answer the specific question.
   * It might be useful for a broader understanding.
   */
  Context = 2,
  /**
   * The resource contains significant information that directly addresses a major part of the user's query.
   * It is a strong candidate for inclusion when forming an answer.
   */
  Relevant = 3,
  /**
   * The resource directly and comprehensively answers the core question of the query.
   * It is essential source material and must be prioritized for creating the final response.
   */
  Crucial = 4,
}

const toRelevanceRating = (score: number): RelevanceScore => {
  if (score >= 0 && score <= 4 && Object.values(RelevanceScore).includes(score)) {
    return score;
  }
  throw new Error(`Invalid relevance score received: ${score}. Must be between 0 and 4.`);
};

/**
 * Represents a resource that should be checked for relevance against a query
 */
export interface RelevanceCandidate {
  content: unknown;
}

/**
 * A relevance score with its reason
 */
export interface RatingWithReason {
  score: RelevanceScore;
  reason: string;
}

/**
 * Score the relevance of a set of resources to the provided query, using an LLM
 */
export const scoreRelevance = async ({
  query,
  model,
  resources,
}: {
  query: string;
  resources: RelevanceCandidate[];
  model: ScopedModel;
}): Promise<RatingWithReason[]> => {
  const rankingModel = model.chatModel.withStructuredOutput(
    z.object({
      ratings: z
        .array(
          z.object({
            id: z.number().int().describe("The document's unique integer identifier."),
            reason: z
              .string()
              .describe('A brief, one-sentence justification for the assigned score.'),
            score: z.number().int().min(0).max(4).describe('The relevance score from 0 to 4.'),
          })
        )
        .describe('An array of relevance ratings, one for each document.'),
    })
  );

  const { ratings } = await rankingModel.invoke(
    getRankingPrompt({
      query,
      resources,
    })
  );

  const sortedRatings: RatingWithReason[] = [];
  for (const { id: index, score, reason } of ratings) {
    if (index < resources.length) {
      sortedRatings[index] = {
        score: toRelevanceRating(score),
        reason,
      };
    }
  }

  // Verify that the LLM returned a rating for every single resource.
  if (sortedRatings.length !== resources.length || sortedRatings.includes(undefined as any)) {
    throw new Error(
      `Relevance scoring failed: The number of ratings received from the model (${
        sortedRatings.filter(Boolean).length
      }) does not match the number of resources provided (${resources.length}).`
    );
  }

  return sortedRatings;
};

const getRankingPrompt = ({
  query,
  resources,
}: {
  query: string;
  resources: RelevanceCandidate[];
}): BaseMessageLike[] => {
  const resultEntry = (resource: RelevanceCandidate, index: number): string => {
    const contentString =
      typeof resource.content === 'string'
        ? resource.content
        : JSON.stringify(resource.content, null, 2);

    return `<document id="${index}">
                <id>${index}</id>
                <content>
                  \`\`\`json
                  ${contentString}
                  \`\`\`
                </content>
            </document>`;
  };

  return [
    [
      'system',
      `You are an expert relevance-scoring agent. Your mission is to meticulously analyze a list of documents and rate their relevance to a user's query on a scale of 0 to 4.

      ## Scoring Criteria
      - **0: Irrelevant**: The document has no connection to the query...
      - **1: Tangential**: The document mentions a keyword from the query but in a different context...
      - **2: Contextual**: The document provides general context or background information...
      - **3: Relevant**: The document contains significant information that directly addresses a major part of the query...
      - **4: Crucial / Essential**: The document directly and comprehensively answers the core question...

      ## Instructions
      1.  Carefully review the user's <query>.
      2.  For each <document>, independently evaluate its content against the query.
        2.1.  Provide a brief, one-sentence analyze or justification in the 'reason' field.
        2.2.  Assign a score from 0 to 4 based on the scoring criteria in the 'score' field.
      3.  You MUST respond with a single, valid JSON object that adheres to the schema below. Do not include any other text or explanations before or after the JSON object.

      ## JSON Schema
      Your output must be a JSON object with a single key "ratings". This key holds an array of rating objects. Each rating object must contain:
      - "id": The integer ID of the document.
      - "score": An integer from 0 to 4.
      - "reason": A brief string explaining the score.

      ### Example of response
      \`\`\`json
      {
        "ratings" : [
          {
            "id": 0,
            "reason": "This document directly explains the primary concept mentioned in the query.",
            "score": 4
          },
          {
            "id": 1,
            "reason": "This document only mentions a keyword from the query in passing without any relevant context.",
            "score": 1
          }
        ]
      }
      \`\`\``,
    ],
    [
      'human',
      `<query>
      ${query}
      </query>

      <documents>
      ${resources.map(resultEntry).join('\n\n')}
      </documents>

      Now, provide your relevance ratings in the specified JSON format.
    `,
    ],
  ];
};
