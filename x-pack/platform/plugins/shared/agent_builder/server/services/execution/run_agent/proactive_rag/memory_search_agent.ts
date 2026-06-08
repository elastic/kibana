/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ExtractedContext, MemoryFinding, ProactiveRagConfig } from './types';
import { buildSearchQuery } from './context_extractor';

const MEMORIES_DATA_STREAM = '.significant_events-memories';

interface MemoryPage {
  id: string;
  name: string;
  title: string;
  content: string;
  categories: string[];
  tags: string[];
  is_deleted?: boolean;
}

interface SearchMemoryParams {
  context: ExtractedContext;
  esClient: ElasticsearchClient;
  chatModel: InferenceChatModel;
  config: ProactiveRagConfig;
  logger: Logger;
}

interface SearchMemoryResult {
  findings: MemoryFinding[];
  searchQuery: string;
}

/**
 * Search memory wiki pages for relevant information.
 * Uses ES search followed by LLM-based relevance assessment.
 */
export const searchMemory = async ({
  context,
  esClient,
  chatModel,
  config,
  logger,
}: SearchMemoryParams): Promise<SearchMemoryResult> => {
  logger.info(`[ProactiveRAG:searchMemory] Starting search...`);

  const searchQuery = buildSearchQuery(context);
  logger.info(`[ProactiveRAG:searchMemory] Built search query: "${searchQuery}"`);

  if (!searchQuery || searchQuery.length < 3) {
    logger.info(
      `[ProactiveRAG:searchMemory] Query too short (${searchQuery?.length ?? 0} chars), skipping`
    );
    return { findings: [], searchQuery };
  }

  try {
    logger.info(`[ProactiveRAG:searchMemory] Searching ES index ${MEMORIES_DATA_STREAM}...`);

    const searchResults = await searchMemoryPages({
      esClient,
      query: searchQuery,
      size: config.maxFindings * 2,
      logger,
    });

    logger.info(`[ProactiveRAG:searchMemory] ES returned ${searchResults.length} results`);

    if (searchResults.length === 0) {
      logger.info(`[ProactiveRAG:searchMemory] No ES results, returning empty`);
      return { findings: [], searchQuery };
    }

    searchResults.forEach((r, i) => {
      logger.info(
        `[ProactiveRAG:searchMemory]   Result ${i + 1}: "${r.page.title}" (score=${r.score})`
      );
    });

    logger.info(`[ProactiveRAG:searchMemory] Assessing relevance with LLM...`);

    const findings = await assessRelevance({
      context,
      searchResults,
      chatModel,
      config,
      logger,
    });

    logger.info(`[ProactiveRAG:searchMemory] LLM assessed ${findings.length} as relevant`);

    return { findings, searchQuery };
  } catch (error) {
    logger.error(`[ProactiveRAG:searchMemory] Search failed: ${error}`);
    return { findings: [], searchQuery };
  }
};

interface SearchMemoryPagesParams {
  esClient: ElasticsearchClient;
  query: string;
  size: number;
  logger: Logger;
}

interface MemorySearchHit {
  page: MemoryPage;
  score: number;
  snippet: string;
}

const searchMemoryPages = async ({
  esClient,
  query,
  size,
  logger,
}: SearchMemoryPagesParams): Promise<MemorySearchHit[]> => {
  try {
    const response = await esClient.search<MemoryPage>({
      index: MEMORIES_DATA_STREAM,
      track_total_hits: false,
      size,
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ['title^3', 'content', 'name^2', 'tags^2', 'categories^2'],
                type: 'best_fields',
                fuzziness: 'AUTO',
              },
            },
          ],
          must_not: [{ term: { is_deleted: true } }],
        },
      },
      collapse: { field: 'id' },
      sort: [{ _score: { order: 'desc' } }],
      highlight: {
        fields: {
          content: { fragment_size: 300, number_of_fragments: 1 },
          title: {},
        },
      },
    });

    return response.hits.hits.flatMap((hit) => {
      const source = hit._source;
      if (!source || source.is_deleted) return [];

      return [
        {
          page: source,
          score: hit._score ?? 0,
          snippet: hit.highlight?.content?.[0] ?? source.content.substring(0, 300),
        },
      ];
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('index_not_found_exception')) {
      logger.debug('Memory index not found, skipping proactive RAG search');
      return [];
    }
    throw error;
  }
};

interface AssessRelevanceParams {
  context: ExtractedContext;
  searchResults: MemorySearchHit[];
  chatModel: InferenceChatModel;
  config: ProactiveRagConfig;
  logger: Logger;
}

const assessRelevance = async ({
  context,
  searchResults,
  chatModel,
  config,
  logger,
}: AssessRelevanceParams): Promise<MemoryFinding[]> => {
  if (searchResults.length === 0) {
    return [];
  }

  const contextSummary = [
    context.userIntent && `User intent: ${context.userIntent}`,
    context.topics.length > 0 && `Topics: ${context.topics.join(', ')}`,
    context.entities.length > 0 && `Entities: ${context.entities.join(', ')}`,
    context.recentQuestions.length > 0 && `Recent question: ${context.recentQuestions[0]}`,
  ]
    .filter(Boolean)
    .join('\n');

  const pagesInfo = searchResults
    .map(
      (result, idx) =>
        `[${idx + 1}] "${result.page.title}" (${result.page.name})\nSnippet: ${result.snippet}`
    )
    .join('\n\n');

  const prompt = `You are assessing which knowledge base pages are relevant to the current conversation context.

## Conversation Context
${contextSummary}

## Candidate Pages
${pagesInfo}

## Task
For each page that is HIGHLY relevant to the conversation context, provide:
1. The page number (1-${searchResults.length})
2. A brief reason why it's relevant (1 sentence)

Only include pages that would genuinely help answer the user's question or provide important background context.
Respond in JSON format:
{
  "relevant_pages": [
    { "page_number": 1, "reason": "Explains the service architecture being discussed" },
    { "page_number": 3, "reason": "Contains troubleshooting steps for this error type" }
  ]
}

If no pages are relevant, respond with: { "relevant_pages": [] }`;

  try {
    const response = await chatModel.invoke(prompt);
    const content = typeof response.content === 'string' ? response.content : '';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.debug('Proactive RAG: Could not parse LLM relevance response');
      return searchResults.slice(0, config.maxFindings).map((result) => ({
        pageId: result.page.id,
        pageName: result.page.name,
        pageTitle: result.page.title,
        relevantExcerpt: result.snippet,
        relevanceReason: 'Potentially relevant based on search score',
        score: result.score,
      }));
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      relevant_pages?: Array<{ page_number: number; reason: string }>;
    };

    const relevantPages = parsed.relevant_pages ?? [];

    return relevantPages
      .filter((p) => p.page_number >= 1 && p.page_number <= searchResults.length)
      .slice(0, config.maxFindings)
      .map((p) => {
        const result = searchResults[p.page_number - 1];
        return {
          pageId: result.page.id,
          pageName: result.page.name,
          pageTitle: result.page.title,
          relevantExcerpt: result.snippet,
          relevanceReason: p.reason,
          score: result.score,
        };
      });
  } catch (error) {
    logger.warn(`Proactive RAG relevance assessment failed: ${error}`);
    return searchResults
      .filter((r) => r.score >= config.minScore)
      .slice(0, config.maxFindings)
      .map((result) => ({
        pageId: result.page.id,
        pageName: result.page.name,
        pageTitle: result.page.title,
        relevantExcerpt: result.snippet,
        relevanceReason: 'Relevant based on search score',
        score: result.score,
      }));
  }
};
