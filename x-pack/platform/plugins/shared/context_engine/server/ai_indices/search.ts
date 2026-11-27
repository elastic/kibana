/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { isEsqlUnknownIndexError } from '@kbn/storage-adapter';
import type { AiIndexItem, QueryAiIndicesResponse } from '../../common/http_api/ai_indices';
import type { KiJsonValue } from '../../common/http_api/knowledge_indicators';
import { isKiJsonObject } from '../../common/ki_lifecycle_status';
import { probeAiIndices, type ProbedAiIndex } from './filter_readable_ai_indices';
import { queryAiIndices } from './query';
import type { AiIndexService } from './service';

export interface SearchAiIndicesRequest {
  readonly query: string;
  readonly userId: string;
  readonly size: number;
  /** When omitted, searches every readable AI index in the space. An empty list searches none. */
  readonly aiIndexIds?: readonly string[];
}

export interface SearchAiIndicesParams extends SearchAiIndicesRequest {
  readonly esClient: ElasticsearchClient;
  readonly aiIndexService: Pick<AiIndexService, 'list'>;
  readonly logger: Logger;
  readonly spaceId: string;
}

export interface AiIndexSearchResult {
  readonly id: string;
  readonly aiIndexId: string;
  readonly date?: string;
  readonly content: string;
  readonly attributes?: Record<string, KiJsonValue>;
}

type Row = Record<string, KiJsonValue | undefined>;

const BACKING_INDEX_PATTERN = /^\.ds-(.+)-\d{4}\.\d{2}\.\d{2}-\d+$/;

const assertSearchScope = ({
  spaceId,
  userId,
  query,
}: Pick<SearchAiIndicesParams, 'spaceId' | 'userId' | 'query'>): void => {
  if (spaceId.trim() === '') {
    throw new Error('AI index search requires a non-empty spaceId');
  }
  if (userId.trim() === '') {
    throw new Error('AI index search requires a non-empty userId');
  }
  if (query.trim() === '') {
    throw new Error('AI index search requires a non-empty query');
  }
};

const probeReadable = async ({
  esClient,
  aiIndices,
  logger,
}: {
  esClient: ElasticsearchClient;
  aiIndices: AiIndexItem[];
  logger: Logger;
}): Promise<ProbedAiIndex[]> => {
  try {
    return await probeAiIndices({ esClient, aiIndices, logger });
  } catch (error) {
    if (isResponseError(error) && error.statusCode === 403) {
      logger.debug(`AI index search skipped: no readable AI index (${error.message})`);
      return [];
    }
    throw error;
  }
};

const buildHybridQuery = (targets: readonly AiIndexItem[], size: number): string => {
  const fromSources = targets.map(({ dest }) => JSON.stringify(dest.value)).join(', ');
  return [
    `FROM ${fromSources} METADATA _id, _index, _score`,
    '| FORK',
    `    ( WHERE MATCH(content, ?query) | SORT _score DESC | LIMIT ${size} )`,
    `    ( WHERE MATCH(content.semantic, ?query) | SORT _score DESC | LIMIT ${size} )`,
    '| FUSE',
    '| SORT _score DESC, _id ASC',
    '| KEEP _index, _id, id, updated_at, @timestamp, content, attributes',
  ].join('\n');
};

const toRows = ({ columns, values }: QueryAiIndicesResponse): Row[] =>
  values.map((value) =>
    Object.fromEntries(columns.map(({ name }, column) => [name, value[column]]))
  );

const nonEmptyString = (value: KiJsonValue | undefined): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

/**
 * Returns the active, unexpired Knowledge Indicators of the selected readable AI indices that best match the query, in hybrid rank order.
 */
export const searchAiIndices = async ({
  esClient,
  aiIndexService,
  logger,
  spaceId,
  userId,
  query,
  size,
  aiIndexIds,
}: SearchAiIndicesParams): Promise<AiIndexSearchResult[]> => {
  assertSearchScope({ spaceId, userId, query });
  if (size <= 0 || aiIndexIds?.length === 0) {
    return [];
  }

  const registry = await aiIndexService.list(spaceId);
  const requested = aiIndexIds === undefined ? undefined : new Set(aiIndexIds);
  const selected = requested ? registry.filter(({ id }) => requested.has(id)) : registry;
  if (selected.length === 0) {
    return [];
  }
  const probed = await probeReadable({ esClient, aiIndices: selected, logger });

  const targetsByDest = new Map<string, AiIndexItem>();
  for (const { aiIndex, failure, missing } of probed) {
    if (failure === undefined && !missing && !targetsByDest.has(aiIndex.dest.value)) {
      targetsByDest.set(aiIndex.dest.value, aiIndex);
    }
  }
  const targets = [...targetsByDest.values()];
  if (targets.length === 0) {
    return [];
  }

  const resolveAiIndexId = (index: string | undefined): string | undefined => {
    if (index === undefined) {
      return undefined;
    }
    const plain = targetsByDest.get(index);
    if (plain?.dest.type === 'index') {
      return plain.id;
    }
    const streamName = BACKING_INDEX_PATTERN.exec(index)?.[1];
    const stream = streamName !== undefined ? targetsByDest.get(streamName) : undefined;
    return stream?.dest.type === 'data_stream' ? stream.id : undefined;
  };

  let response: QueryAiIndicesResponse;
  try {
    response = await queryAiIndices({
      esClient,
      spaceId,
      query: buildHybridQuery(targets, size),
      params: { query },
      limit: size,
      user_id: userId,
      aiIndexDests: targets.map(({ dest }) => dest),
    });
  } catch (error) {
    if (isEsqlUnknownIndexError(error)) {
      return [];
    }
    throw error;
  }

  return toRows(response).flatMap((row): AiIndexSearchResult[] => {
    const aiIndexId = resolveAiIndexId(nonEmptyString(row._index));
    const id = nonEmptyString(row.id) ?? nonEmptyString(row._id);
    const content = nonEmptyString(row.content);
    if (aiIndexId === undefined || id === undefined || content === undefined) {
      return [];
    }
    const date = nonEmptyString(row.updated_at) ?? nonEmptyString(row['@timestamp']);
    const { attributes } = row;
    return [
      {
        id,
        aiIndexId,
        ...(date ? { date } : {}),
        content,
        ...(isKiJsonObject(attributes) && Object.keys(attributes).length > 0 ? { attributes } : {}),
      },
    ];
  });
};
