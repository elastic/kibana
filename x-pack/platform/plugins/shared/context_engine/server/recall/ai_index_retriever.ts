/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { RECALL_AI_INDEX_PREFIX } from '../../common/constants';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import type { KiJsonValue } from '../../common/http_api/knowledge_indicators';
import type { AiIndexRecallResult } from '../../common/http_api/recall';
import { isKiJsonObject } from '../../common/ki_lifecycle_status';
import { buildAiIndexSpaceFilter, buildAiIndexUserFilter } from '../../common/space_filter';
import { filterReadableAiIndices } from '../ai_indices/filter_readable_ai_indices';
import type { AiIndexService } from '../ai_indices/service';
import type { RecallAiIndexSelector } from './include';

export interface AiIndexRecallParams {
  readonly esClient: ElasticsearchClient;
  readonly aiIndexService: Pick<AiIndexService, 'list'>;
  readonly logger: Logger;
  readonly space: string;
  readonly userId: string;
  readonly query: string;
  readonly selector: RecallAiIndexSelector;
  readonly size: number;
}

interface AiIndexHitSource {
  readonly id?: string;
  readonly updated_at?: string;
  readonly '@timestamp'?: string;
  readonly content?: string;
  readonly attributes?: KiJsonValue;
}

interface RevisionRef {
  readonly index: string;
  readonly docId: string;
}

interface Target {
  readonly aiIndexId: string;
  readonly destValue: string;
  readonly isDataStream: boolean;
  readonly latestRevisions: Map<string, RevisionRef | undefined>;
  readonly emittedKiIds: Set<string>;
}

interface Candidate {
  readonly index: string;
  readonly docId: string;
  readonly kiId: string;
  readonly source: AiIndexHitSource | undefined;
  readonly target: Target;
}

const CANDIDATE_OVERFETCH_FACTOR = 2;
const MAX_AI_INDEX_RECALL_ROUNDS = 3;
const BACKING_INDEX_PATTERN = /^\.ds-(.+)-\d{4}\.\d{2}\.\d{2}-\d+$/;

const ACTIVE_FILTER: QueryDslQueryContainer = {
  bool: {
    should: [
      { bool: { must_not: [{ exists: { field: 'governance.lifecycle.status' } }] } },
      { term: { 'governance.lifecycle.status': 'active' } },
    ],
    minimum_should_match: 1,
  },
};

const UNEXPIRED_FILTER: QueryDslQueryContainer = {
  bool: {
    should: [
      { bool: { must_not: [{ exists: { field: 'expires_at' } }] } },
      { range: { expires_at: { gt: 'now' } } },
    ],
    minimum_should_match: 1,
  },
};

const assertScope = (space: string, userId: string): void => {
  if (space.trim() === '') {
    throw new Error('AI index recall scope requires a non-empty space');
  }
  if (userId.trim() === '') {
    throw new Error('AI index recall scope requires a non-empty userId');
  }
};

const selectAiIndices = (
  aiIndices: AiIndexItem[],
  selector: RecallAiIndexSelector
): AiIndexItem[] => {
  switch (selector.kind) {
    case 'none':
      return [];
    case 'all':
      return aiIndices;
    case 'ids': {
      const requested = new Set(selector.ids);
      return aiIndices.filter(({ id }) => requested.has(id));
    }
    default: {
      const exhaustive: never = selector;
      throw new Error(`Unknown AI index selector: ${JSON.stringify(exhaustive)}`);
    }
  }
};

const readReadableAiIndices = async ({
  esClient,
  aiIndices,
  logger,
}: {
  esClient: ElasticsearchClient;
  aiIndices: AiIndexItem[];
  logger: Logger;
}): Promise<AiIndexItem[]> => {
  try {
    return await filterReadableAiIndices({ esClient, aiIndices, logger });
  } catch (error) {
    if (isResponseError(error) && error.statusCode === 403) {
      logger.debug(`AI index recall skipped: no readable AI index (${error.message})`);
      return [];
    }
    throw error;
  }
};

const resolveTarget = (
  targetsByDest: ReadonlyMap<string, Target>,
  index: string
): Target | undefined => {
  const direct = targetsByDest.get(index);
  if (direct) {
    return direct;
  }
  const streamName = BACKING_INDEX_PATTERN.exec(index)?.[1];
  const stream = streamName === undefined ? undefined : targetsByDest.get(streamName);
  return stream?.isDataStream ? stream : undefined;
};

const buildExclusions = (
  excludedDocsByIndex: ReadonlyMap<string, Set<string>>
): QueryDslQueryContainer[] =>
  [...excludedDocsByIndex].map(([index, docIds]) => ({
    bool: { filter: [{ term: { _index: index } }, { ids: { values: [...docIds] } }] },
  }));

const fetchLatestDocIds = async (
  esClient: ElasticsearchClient,
  target: Target,
  kiIds: readonly string[]
): Promise<void> => {
  const response = await esClient.search<Pick<AiIndexHitSource, 'id'>>({
    index: target.destValue,
    ignore_unavailable: true,
    allow_no_indices: true,
    allow_partial_search_results: false,
    size: kiIds.length,
    _source: ['id'],
    query: { bool: { filter: [{ terms: { id: [...kiIds] } }] } },
    collapse: { field: 'id' },
    sort: [
      { '@timestamp': { order: 'desc', unmapped_type: 'date' } },
      { updated_at: { order: 'desc', unmapped_type: 'date' } },
      {
        'governance.lifecycle.status': {
          order: 'desc',
          unmapped_type: 'keyword',
          missing: '_last',
        },
      },
    ],
  });
  const fetched = new Map(
    response.hits.hits.flatMap(({ _index: index, _id: docId, _source: source }) =>
      index && docId && source?.id ? [[source.id, { index, docId }] as const] : []
    )
  );
  for (const kiId of kiIds) {
    target.latestRevisions.set(kiId, fetched.get(kiId));
  }
};

const verifyDataStreamCandidates = async (
  esClient: ElasticsearchClient,
  candidates: readonly Candidate[]
): Promise<void> => {
  const unseenKiIdsByTarget = new Map<Target, Set<string>>();
  for (const { target, kiId } of candidates) {
    if (!target.isDataStream || target.latestRevisions.has(kiId)) {
      continue;
    }
    const kiIds = unseenKiIdsByTarget.get(target) ?? new Set<string>();
    kiIds.add(kiId);
    unseenKiIdsByTarget.set(target, kiIds);
  }
  await Promise.all(
    [...unseenKiIdsByTarget].map(([target, kiIds]) =>
      fetchLatestDocIds(esClient, target, [...kiIds])
    )
  );
};

const isLatestRevision = ({ target, kiId, index, docId, source }: Candidate): boolean => {
  if (!target.isDataStream) {
    return true;
  }
  const latest = target.latestRevisions.get(kiId);
  return source?.id ? latest?.index === index && latest.docId === docId : latest === undefined;
};

const toResult = ({ kiId, source, target }: Candidate): AiIndexRecallResult | undefined => {
  if (!source?.content) {
    return undefined;
  }
  const { content, attributes } = source;
  const date = source.updated_at || source['@timestamp'];
  return {
    id: kiId,
    source: `${RECALL_AI_INDEX_PREFIX}${target.aiIndexId}`,
    ...(date ? { date } : {}),
    content,
    ...(isKiJsonObject(attributes) && Object.keys(attributes).length > 0 ? { attributes } : {}),
  };
};

/**
 * Returns the active, unexpired Knowledge Indicators of the selected readable AI indices that best match the query, in hybrid rank order.
 */
export const retrieveAiIndices = async ({
  esClient,
  aiIndexService,
  logger,
  space,
  userId,
  query,
  selector,
  size,
}: AiIndexRecallParams): Promise<AiIndexRecallResult[]> => {
  assertScope(space, userId);
  if (size <= 0 || selector.kind === 'none') {
    return [];
  }

  const selected = selectAiIndices(await aiIndexService.list(space), selector);
  if (selected.length === 0) {
    return [];
  }
  const readable = await readReadableAiIndices({ esClient, aiIndices: selected, logger });

  const targetsByDest = new Map<string, Target>();
  for (const { id, dest } of readable) {
    if (!targetsByDest.has(dest.value)) {
      targetsByDest.set(dest.value, {
        aiIndexId: id,
        destValue: dest.value,
        isDataStream: dest.type === 'data_stream',
        latestRevisions: new Map(),
        emittedKiIds: new Set(),
      });
    }
  }
  const targets = [...targetsByDest.values()];
  if (targets.length === 0) {
    return [];
  }

  const hasDataStreams = targets.some(({ isDataStream }) => isDataStream);
  const fetchSize = hasDataStreams ? size * CANDIDATE_OVERFETCH_FACTOR : size;
  const rankWindowSize = size * CANDIDATE_OVERFETCH_FACTOR;
  const filters = [
    buildAiIndexSpaceFilter(space),
    buildAiIndexUserFilter(userId),
    ACTIVE_FILTER,
    UNEXPIRED_FILTER,
  ];
  const excludedDocsByIndex = new Map<string, Set<string>>();
  const results: AiIndexRecallResult[] = [];

  for (let round = 0; round < MAX_AI_INDEX_RECALL_ROUNDS; round++) {
    const mustNot = buildExclusions(excludedDocsByIndex);
    const response = await esClient.search<AiIndexHitSource>({
      index: targets.map(({ destValue }) => destValue),
      ignore_unavailable: true,
      allow_no_indices: true,
      size: fetchSize,
      _source: ['id', 'updated_at', '@timestamp', 'content', 'attributes'],
      retriever: {
        rrf: {
          retrievers: [
            { standard: { query: { match: { content: query } } } },
            { standard: { query: { match: { 'content.semantic': query } } } },
          ],
          filter: {
            bool: { filter: filters, ...(mustNot.length > 0 ? { must_not: mustNot } : {}) },
          },
          rank_window_size: rankWindowSize,
        },
      },
    });

    const { hits } = response.hits;
    const candidates = hits.flatMap(({ _index: index, _id: docId, _source: source }) => {
      const target = resolveTarget(targetsByDest, index);
      return docId && target ? [{ index, docId, kiId: source?.id || docId, source, target }] : [];
    });
    await verifyDataStreamCandidates(esClient, candidates);

    let newExclusions = 0;
    for (const candidate of candidates) {
      if (results.length === size) {
        break;
      }
      const { index, docId, kiId, target } = candidate;
      const excludedDocIds = excludedDocsByIndex.get(index) ?? new Set<string>();
      if (!excludedDocIds.has(docId)) {
        excludedDocIds.add(docId);
        excludedDocsByIndex.set(index, excludedDocIds);
        newExclusions++;
      }
      if (target.emittedKiIds.has(kiId) || !isLatestRevision(candidate)) {
        continue;
      }
      const result = toResult(candidate);
      if (result) {
        target.emittedKiIds.add(kiId);
        results.push(result);
      }
    }

    if (
      !hasDataStreams ||
      results.length === size ||
      hits.length < fetchSize ||
      newExclusions === 0
    ) {
      break;
    }
  }

  return results;
};
