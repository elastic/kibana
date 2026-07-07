/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { ToolsStart } from '@kbn/agent-builder-server';
import {
  formatToolResults,
  type BridgedToolResponse,
} from '../../agent_builder/inference_tool_bridge';
import { SCS_SEMANTIC_SEARCH_TOOL_ID } from '../../semantic_code_search_grounding/semantic_code_search_tools';
import { resolveIndexForRepository as resolveCodeIndex } from '../../semantic_code_search_grounding/resolve_code_index';
import { LOGGING_CHUNK_TAG } from './constants';
import type { CodeHit, CodeRepositoryReader, LanguageCount, LoggingChunk } from './types';

const MAX_LANGUAGES = 50;
const MAX_SERVICE_NAMES = 50;
const MAX_SNIPPET_LENGTH = 400;
const MAX_LOGGING_CHUNKS = 500;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

/** SCS workflow tools render their result as Markdown at `data.execution.output`. */
const getOutputText = (response: BridgedToolResponse): string =>
  response.results
    .map(({ data }) => {
      const execution = asRecord(asRecord(data).execution);
      return typeof execution.output === 'string' ? execution.output : '';
    })
    .filter((text) => text.length > 0)
    .join('\n');

const CODE_FENCE = '```';
const HIT_RE = new RegExp(
  '\\*\\*File\\*\\*:\\s*`([^`]+)`[\\s\\S]*?' + CODE_FENCE + '[^\\n]*\\n([\\s\\S]*?)' + CODE_FENCE,
  'g'
);
const FILE_LOCATION_RE = /^(.*):(\d+)-\d+$/;

const extractHits = (markdown: string): CodeHit[] => {
  const hits: CodeHit[] = [];
  let match: RegExpExecArray | null;
  HIT_RE.lastIndex = 0;
  while ((match = HIT_RE.exec(markdown)) !== null) {
    const [, fileLocation, snippet] = match;
    const locationMatch = FILE_LOCATION_RE.exec(fileLocation.trim());
    const file = (locationMatch ? locationMatch[1] : fileLocation).trim();
    const startLine = locationMatch ? Number(locationMatch[2]) : 0;
    hits.push({
      file,
      line: startLine > 0 ? startLine : undefined,
      snippet: snippet.trim().slice(0, MAX_SNIPPET_LENGTH),
    });
  }
  return hits;
};

/**
 * Default {@link CodeRepositoryReader} backed by the SCS Agent Builder tools
 * (code search) and direct Elasticsearch reads (language histogram, change
 * fingerprint, observed service names). Reads degrade gracefully to empty
 * results on error so a single failing source cannot abort identification.
 */
export function createCodeRepositoryReader({
  esClient,
  agentBuilderTools,
  request,
  logger,
}: {
  esClient: ElasticsearchClient;
  agentBuilderTools: ToolsStart;
  request: KibanaRequest;
  logger: Logger;
}): CodeRepositoryReader {
  const indexCache = new Map<string, string | undefined>();
  const resolveIndex = async (repository: string): Promise<string | undefined> => {
    if (indexCache.has(repository)) {
      return indexCache.get(repository);
    }
    const index = await resolveCodeIndex({ esClient, repository, logger });
    indexCache.set(repository, index);
    return index;
  };

  return {
    async getChangeFingerprint(repository) {
      const index = await resolveIndex(repository);
      if (!index) {
        return undefined;
      }
      try {
        const response = await esClient.search({
          index,
          size: 0,
          track_total_hits: false,
          aggs: { max_updated: { max: { field: 'updated_at' } } },
        });
        const agg = response.aggregations?.max_updated as { value_as_string?: string } | undefined;
        return agg?.value_as_string;
      } catch (error) {
        logger.debug(
          `code_features: fingerprint read failed for "${repository}": ${errorMessage(error)}`
        );
        return undefined;
      }
    },

    async getLanguageHistogram(repository) {
      const index = await resolveIndex(repository);
      if (!index) {
        return [];
      }
      try {
        const response = await esClient.search({
          index,
          size: 0,
          track_total_hits: false,
          aggs: { languages: { terms: { field: 'language', size: MAX_LANGUAGES } } },
        });
        const buckets =
          (
            response.aggregations?.languages as {
              buckets?: Array<{ key: string; doc_count: number }>;
            }
          )?.buckets ?? [];
        return buckets.map<LanguageCount>((bucket) => ({
          language: bucket.key,
          count: bucket.doc_count,
        }));
      } catch (error) {
        logger.debug(
          `code_features: language histogram read failed for "${repository}": ${errorMessage(
            error
          )}`
        );
        return [];
      }
    },

    async getObservedServiceNames(index) {
      try {
        const response = await esClient.search({
          index,
          size: 0,
          track_total_hits: false,
          aggs: { services: { terms: { field: 'service.name', size: MAX_SERVICE_NAMES } } },
        });
        const buckets =
          (response.aggregations?.services as { buckets?: Array<{ key: string }> })?.buckets ?? [];
        return buckets.map((bucket) => bucket.key).filter((key) => typeof key === 'string');
      } catch (error) {
        logger.debug(`code_features: observed service.name read failed: ${errorMessage(error)}`);
        return [];
      }
    },

    async searchCode(repository, query) {
      const index = await resolveIndex(repository);
      try {
        const { results } = await agentBuilderTools.execute({
          toolId: SCS_SEMANTIC_SEARCH_TOOL_ID,
          toolParams: { query, repository, ...(index ? { index } : {}) },
          request,
        });
        return extractHits(getOutputText(formatToolResults(results)));
      } catch (error) {
        logger.debug(
          `code_features: code search failed for "${repository}": ${errorMessage(error)}`
        );
        return [];
      }
    },

    async getLoggingChunks(repository, limit = MAX_LOGGING_CHUNKS) {
      const index = await resolveIndex(repository);
      if (!index) {
        return [];
      }
      try {
        const response = await esClient.search<{ content?: string; language?: string }>({
          index,
          size: limit,
          track_total_hits: false,
          _source: ['content', 'language'],
          query: {
            bool: {
              filter: [{ term: { tags: LOGGING_CHUNK_TAG } }, { term: { repository } }],
            },
          },
        });
        return response.hits.hits.flatMap<LoggingChunk>((hit) => {
          const content = hit._source?.content;
          if (typeof content !== 'string' || content.length === 0) {
            return [];
          }
          return [{ content, language: hit._source?.language }];
        });
      } catch (error) {
        logger.debug(
          `code_features: logging chunk read failed for "${repository}": ${errorMessage(error)}`
        );
        return [];
      }
    },
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
