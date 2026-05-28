/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, CoreSetup } from '@kbn/core/server';
import type {
  QueryDslQueryContainer,
  SearchHit,
  Sort,
  SortResults,
} from '@elastic/elasticsearch/lib/api/types';
import type {
  SmlChunk,
  SmlData,
  SmlListItem,
  SmlTypeDefinition,
} from '@kbn/agent-context-layer-plugin/server';
import {
  KI_ATTACHMENT_TYPE,
  KI_SML_TYPE,
  KI_ORIGIN_KIND_FEATURE,
  KI_ORIGIN_KIND_QUERY,
  QUERY_TYPE_STATS,
  decodeKiOriginId,
  encodeKiOriginId,
  type KnowledgeIndicatorAttachmentData,
} from '@kbn/streams-schema';
import { isResponseError } from '@kbn/es-errors';
import objectHash from 'object-hash';
import {
  isExcludedFeature,
  isExcludedQueryLink,
  resolveKnowledgeIndicatorAttachmentData,
} from './resolve_ki_attachment';
import { serializeKiContent } from './ki_content';
import { FEATURE_LAST_SEEN, FEATURE_UUID } from '../../lib/streams/feature/fields';
import { featureStorageSettings } from '../../lib/streams/feature/storage_settings';
import { buildFeatureBaseFilters } from '../../lib/streams/feature/feature_client';
import {
  ASSET_TYPE,
  ASSET_UUID,
  QUERY_DESCRIPTION,
  QUERY_ESQL_QUERY,
  QUERY_SEVERITY_SCORE,
  QUERY_TITLE,
  QUERY_TYPE,
  RULE_BACKED,
  RULE_ID,
} from '../../lib/streams/assets/fields';
import { queryStorageSettings } from '../../lib/streams/assets/storage_settings';
import type { GetScopedClients } from '../../routes/types';
import { getInternalFeatureClient, getInternalQueryClient } from './internal_ki_clients';
import type { StreamsPluginStartDependencies } from '../../types';

interface CreateKnowledgeIndicatorSmlTypeOptions {
  coreSetup: CoreSetup<StreamsPluginStartDependencies>;
  logger: Logger;
  getScopedClients: GetScopedClients;
}

const PAGE_SIZE = 1_000;
const PIT_KEEP_ALIVE = '1m';
const STABLE_QUERY_TIMESTAMP = '1970-01-01T00:00:00.000Z';

/**
 * KI documents are stamped with the Streams feature-level read privilege.
 *
 * Streams currently exposes only feature-level `read_stream` / `manage_stream`
 * privileges — there is no per-stream privilege we can stamp here. So the
 * picker is correctly hidden from users who lack `read_stream` entirely,
 * but among users who have it, every KI is visible regardless of which
 * specific streams the caller can read. Per-stream visibility is enforced
 * later, at attach/resolve time, by the scoped `streamsClient.getStream()`
 * call inside {@link resolveKnowledgeIndicatorAttachmentData}: filtered-out
 * rows return `undefined` and fail closed at conversation time.
 *
 * Tightening this requires registering per-stream privileges in the streams
 * feature definition and threading them through the chunk permissions list.
 * Tracked as a follow-up; the residual gap is "picker may surface rows the
 * caller cannot attach", which is at worst a noisy UX, not a data leak.
 *
 * Spaces are pinned to `['*']` because both the feature and query backing
 * indices are global; per-space scoping happens at the streams resolution
 * layer rather than in the SML index.
 */
const KI_PERMISSIONS = ['api:read_stream'] as const;

const isMissingIndexError = (error: unknown): boolean =>
  isResponseError(error) && error.statusCode === 404;

/**
 * Storage stores documents with literal dotted-string keys (see `toStorage` in
 * `feature_client.ts` and `query_client.ts`). ES returns `_source` exactly as
 * it was indexed, so the slim shapes mirror the dotted-key layout. Reading
 * `hit._source.feature` (treating it as a nested object) silently produces
 * `undefined` and was the bug that the review surfaced.
 */
interface FeatureSlim {
  'feature.uuid'?: string;
  'feature.last_seen'?: string;
}

interface QuerySlim {
  'asset.uuid'?: string;
  'query.title'?: string;
  'query.description'?: string;
  'query.esql.query'?: string;
  'query.severity_score'?: number;
  'query.type'?: string;
  rule_backed?: boolean;
  rule_id?: string;
}

/**
 * Encode a stable content fingerprint for queries so the SML crawler can
 * detect changes even though the storage doesn't carry a timestamp. The
 * timestamp prefix is informational; the crawler compares with `!==` so any
 * hash flip triggers a re-index. The event-driven indexer still catches
 * every actual write — the hash is a fallback for crawler-only paths.
 */
const buildQueryUpdatedAt = (slim: QuerySlim): string => {
  const fingerprint = objectHash(
    {
      title: slim[QUERY_TITLE] ?? '',
      description: slim[QUERY_DESCRIPTION] ?? '',
      esql: slim[QUERY_ESQL_QUERY] ?? '',
      severity_score: slim[QUERY_SEVERITY_SCORE] ?? null,
      query_type: slim[QUERY_TYPE] ?? '',
      rule_backed: slim[RULE_BACKED] ?? false,
      rule_id: slim[RULE_ID] ?? '',
    },
    { algorithm: 'sha1', encoding: 'hex', respectType: false, unorderedObjects: true }
  );
  return `${STABLE_QUERY_TIMESTAMP}#${fingerprint}`;
};

/**
 * Generic point-in-time + search_after iterator. Yields pages of mapped items
 * so the caller never holds more than one page in memory regardless of how
 * large the source index is. Missing-index errors are treated as "nothing to
 * crawl" — the SML happily survives a never-bootstrapped streams index.
 */
const paginatePit = async function* <THit, TItem>({
  esClient,
  logger,
  index,
  sort,
  query,
  source,
  mapHit,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  index: string;
  sort: Sort;
  query?: QueryDslQueryContainer;
  source: string[];
  mapHit: (hit: SearchHit<THit>) => TItem | undefined;
}): AsyncIterable<TItem[]> {
  let pit: { id: string } | undefined;
  try {
    pit = await esClient.openPointInTime({ index, keep_alive: PIT_KEEP_ALIVE });
  } catch (error) {
    if (isMissingIndexError(error)) {
      return;
    }
    logger.warn(`KI SML list: failed to open PIT on '${index}': ${(error as Error).message}`);
    return;
  }

  let searchAfter: SortResults | undefined;
  try {
    while (true) {
      const response = await esClient.search<THit>({
        size: PAGE_SIZE,
        track_total_hits: false,
        _source: source,
        pit: { id: pit.id, keep_alive: PIT_KEEP_ALIVE },
        sort,
        ...(searchAfter ? { search_after: searchAfter } : {}),
        ...(query ? { query } : {}),
      });
      const hits = response.hits.hits;
      if (hits.length === 0) {
        return;
      }
      const mapped = hits.map(mapHit).filter((item): item is TItem => item !== undefined);
      if (mapped.length > 0) {
        yield mapped;
      }
      if (hits.length < PAGE_SIZE) {
        return;
      }
      const lastSort = hits[hits.length - 1].sort;
      if (!lastSort || lastSort.length === 0) {
        return;
      }
      searchAfter = lastSort;
    }
  } finally {
    try {
      await esClient.closePointInTime({ id: pit.id });
    } catch (error) {
      logger.debug(`KI SML list: failed to close PIT on '${index}': ${(error as Error).message}`);
    }
  }
};

/**
 * Iterate every page of features that should participate in the SML. Reuses
 * `buildFeatureBaseFilters` so the picker mirrors the read paths exposed by
 * `getFeatures` / `findFeatures` — i.e. drops expired and excluded rows.
 */
const listFeatureItems = (
  esClient: ElasticsearchClient,
  logger: Logger
): AsyncIterable<SmlListItem[]> =>
  paginatePit<FeatureSlim, SmlListItem>({
    esClient,
    logger,
    index: featureStorageSettings.name,
    sort: [{ [FEATURE_UUID]: 'asc' }],
    source: [FEATURE_UUID, FEATURE_LAST_SEEN],
    query: {
      bool: {
        filter: buildFeatureBaseFilters({ includeExpired: false, includeExcluded: false }),
      },
    },
    mapHit: (hit) => {
      const uuid = hit._source?.[FEATURE_UUID] ?? hit._id;
      if (!uuid) {
        return undefined;
      }
      return {
        id: encodeKiOriginId({ kind: KI_ORIGIN_KIND_FEATURE, id: uuid }),
        updatedAt: hit._source?.[FEATURE_LAST_SEEN] ?? STABLE_QUERY_TIMESTAMP,
        spaces: ['*'],
      };
    },
  });

/**
 * Mirrors the read-side defaults of `getQueryLinks`: rule-backed queries
 * only, STATS excluded (those aren't useful as KIs and aren't promotable to
 * rules anyway). Without this filter, the picker surfaces query rows that
 * the resolver would refuse to attach.
 */
const listQueryItems = (
  esClient: ElasticsearchClient,
  logger: Logger
): AsyncIterable<SmlListItem[]> =>
  paginatePit<QuerySlim, SmlListItem>({
    esClient,
    logger,
    index: queryStorageSettings.name,
    sort: [{ [ASSET_UUID]: 'asc' }],
    source: [
      ASSET_UUID,
      QUERY_TITLE,
      QUERY_DESCRIPTION,
      QUERY_ESQL_QUERY,
      QUERY_SEVERITY_SCORE,
      QUERY_TYPE,
      RULE_BACKED,
      RULE_ID,
    ],
    query: {
      bool: {
        filter: [{ term: { [ASSET_TYPE]: 'query' } }, { term: { [RULE_BACKED]: true } }],
        must_not: [{ term: { [QUERY_TYPE]: QUERY_TYPE_STATS } }],
      },
    },
    mapHit: (hit) => {
      const source = hit._source;
      const uuid = source?.[ASSET_UUID] ?? hit._id;
      if (!uuid) {
        return undefined;
      }
      return {
        id: encodeKiOriginId({ kind: KI_ORIGIN_KIND_QUERY, id: uuid }),
        // Queries don't carry a timestamp on the document, so we encode a
        // content fingerprint as the change-detection token. Whenever any
        // user-visible field flips, the hash flips and the SmlCrawler
        // (which uses `!==` for change detection) re-indexes the chunk.
        updatedAt: source ? buildQueryUpdatedAt(source) : STABLE_QUERY_TIMESTAMP,
        spaces: ['*'],
      };
    },
  });

/**
 * Build the SML chunk for a specific feature uuid. Returns `undefined` when
 * the feature is no longer present so the indexer marks the existing chunks
 * for deletion.
 */
const buildFeatureChunk = async (
  uuid: string,
  coreSetup: CoreSetup<StreamsPluginStartDependencies>,
  logger: Logger
): Promise<SmlData | undefined> => {
  try {
    const featureClient = await getInternalFeatureClient(coreSetup, logger);
    const [resolved] = await featureClient.findFeaturesByUuids([uuid]);
    if (!resolved) {
      return undefined;
    }
    const feature = await featureClient.getFeature(resolved.stream_name, uuid);
    if (isExcludedFeature(feature)) {
      return undefined;
    }

    const data: KnowledgeIndicatorAttachmentData = {
      kind: KI_ORIGIN_KIND_FEATURE,
      feature,
      stream_name: resolved.stream_name,
    };
    const chunk: SmlChunk = {
      type: KI_SML_TYPE,
      title: feature.title ?? feature.id,
      content: serializeKiContent(data),
      permissions: [...KI_PERMISSIONS],
    };
    if (feature.description) {
      chunk.description = feature.description;
    }

    return { chunks: [chunk] };
  } catch (error) {
    logger.debug(
      `KI SML getSmlData: feature '${uuid}' not retrievable: ${(error as Error).message}`
    );
    return undefined;
  }
};

const buildQueryChunk = async (
  uuid: string,
  coreSetup: CoreSetup<StreamsPluginStartDependencies>,
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<SmlData | undefined> => {
  try {
    const queryClient = await getInternalQueryClient(esClient, logger);
    const [link] = await queryClient.findQueryLinksByUuids([uuid]);
    if (!link || isExcludedQueryLink(link)) {
      return undefined;
    }

    const data: KnowledgeIndicatorAttachmentData = {
      kind: KI_ORIGIN_KIND_QUERY,
      query: link.query,
      stream_name: link.stream_name,
      rule: { backed: link.rule_backed, id: link.rule_id },
    };
    const chunk: SmlChunk = {
      type: KI_SML_TYPE,
      title: link.query.title ?? link.query.id,
      content: serializeKiContent(data),
      permissions: [...KI_PERMISSIONS],
    };
    if (link.query.description) {
      chunk.description = link.query.description;
    }

    return { chunks: [chunk] };
  } catch (error) {
    logger.debug(`KI SML getSmlData: query '${uuid}' not retrievable: ${(error as Error).message}`);
    return undefined;
  }
};

export const createKnowledgeIndicatorSmlType = ({
  coreSetup,
  logger,
  getScopedClients,
}: CreateKnowledgeIndicatorSmlTypeOptions): SmlTypeDefinition => ({
  id: KI_SML_TYPE,

  async *list(context) {
    yield* listFeatureItems(context.esClient, logger);
    yield* listQueryItems(context.esClient, logger);
  },

  getSmlData: async (originId, context) => {
    const decoded = decodeKiOriginId(originId);
    if (!decoded) {
      logger.warn(`KI SML getSmlData: unrecognized originId '${originId}'`);
      return undefined;
    }
    if (decoded.kind === KI_ORIGIN_KIND_FEATURE) {
      return buildFeatureChunk(decoded.id, coreSetup, logger);
    }
    return buildQueryChunk(decoded.id, coreSetup, context.esClient, logger);
  },

  toAttachment: async (item, context) => {
    const decoded = decodeKiOriginId(item.origin_id);
    if (!decoded) {
      logger.warn(`KI SML toAttachment: unrecognized origin_id '${item.origin_id}'`);
      return undefined;
    }
    const data = await resolveKnowledgeIndicatorAttachmentData(
      decoded.kind,
      decoded.id,
      context.request,
      getScopedClients,
      logger
    );
    if (!data) {
      return undefined;
    }
    return {
      type: KI_ATTACHMENT_TYPE,
      data,
      origin: item.origin_id,
    };
  },
});
