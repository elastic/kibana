/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BulkResponse,
  SearchRequest,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { StorageSchema } from '@kbn/storage-adapter';
import { BulkOperationError, types } from '@kbn/storage-adapter';
import type { Improvement } from '../../common/http_api/improvements';
import { IMPROVEMENTS_INDEX } from '../../common/http_api/improvements';

/** The template that shapes the improvements index when the first write creates it. */
export const IMPROVEMENTS_INDEX_TEMPLATE = `${IMPROVEMENTS_INDEX}-index-template`;

/**
 * Mapping for the global improvements index.
 *
 * `payload` and `resolution` are `object({ enabled: false })`: kept in `_source` but not indexed.
 * Proposed KI content and workflow YAML routinely run to several kilobytes, so `flattened` with
 * its `ignore_above` would silently drop them, and nothing queries inside the change anyway. The
 * queries that matter — "every suggestion touching workflow X" — are served by `target.*`, with
 * the exception of `target.source_value`, which is unbounded for the same reason.
 */
export const improvementsSchema = {
  properties: {
    improvement_id: types.keyword({}),
    revision_id: types.keyword({}),
    previous_revision_id: types.keyword({}),
    latest: types.boolean({}),
    ai_index_id: types.keyword({}),
    '@timestamp': types.date({}),
    status: types.keyword({}),
    suggested_at: types.date({}),
    applied_at: types.date({}),
    rejected_at: types.date({}),
    title: types.text({}),
    rationale: types.text({}),
    action: types.keyword({}),
    target: types.object({
      properties: {
        ki_id: types.keyword({}),
        workflow_id: types.keyword({}),
        // A source value is an ES|QL query or a connector reference, so it is unbounded where the
        // other discriminators are ids. Indexed as a keyword it would hit the adapter's default
        // `ignore_above: 1024` and silently stop being searchable past that length — the same
        // silent truncation that rules `flattened` out for `payload`. Nothing queries it either:
        // "which suggestions touch this source" is answered by `improvement_id`, which already
        // hashes the value. So it is kept in `_source` for display and left out of the index.
        source_value: types.keyword({ index: false, doc_values: false }),
        subject: types.keyword({}),
      },
    }),
    payload: types.object({ enabled: false }),
    resolution: types.object({ enabled: false }),
    provenance: types.object({
      properties: {
        agent_run_id: types.keyword({}),
        signal_ids: types.keyword({}),
        signal_spaces: types.keyword({}),
        signal_window: types.object({
          properties: { from: types.date({}), to: types.date({}) },
        }),
        signal_count: types.long({}),
        tags: types.keyword({}),
      },
    }),
  },
} satisfies StorageSchema;

/**
 * Installs the index template that shapes the improvements index.
 *
 * Kibana does this once at start with its own credentials, which needs only the cluster-level
 * `manage_index_templates`. The index itself is then created by Elasticsearch from this template on
 * the first write, under whichever user made that write. That split is what keeps the store off the
 * internal user: were the mappings applied lazily per operation instead, every caller — including
 * anyone merely reading the review UI — would need `manage` on the index.
 */
export const installImprovementsIndexTemplate = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  await esClient.indices.putIndexTemplate({
    name: IMPROVEMENTS_INDEX_TEMPLATE,
    index_patterns: [IMPROVEMENTS_INDEX],
    template: {
      // Every field a revision carries is declared below, so an undeclared one means the writer and
      // this mapping have diverged — better surfaced as a rejected write than silently indexed.
      mappings: { dynamic: 'strict', ...improvementsSchema },
    },
  });
  logger.debug(`Installed index template '${IMPROVEMENTS_INDEX_TEMPLATE}'`);
};

/** A bulk index operation, carrying the OCC guard when the caller is replacing a known revision. */
export interface ImprovementsBulkOperation {
  index: {
    _id: string;
    document: Improvement;
    if_seq_no?: number;
    if_primary_term?: number;
  };
}

export interface ImprovementsBulkRequest {
  operations: ImprovementsBulkOperation[];
  refresh?: 'wait_for' | boolean;
  /** When false, the caller inspects `items` itself — a per-item failure may be expected. */
  throwOnFail?: boolean;
}

/** Reads and writes of the improvements index, bound to one caller's credentials. */
export interface ImprovementsClient {
  search(request: Omit<SearchRequest, 'index'>): Promise<SearchResponse<Improvement>>;
  bulk(request: ImprovementsBulkRequest): Promise<BulkResponse>;
}

/**
 * Binds the improvements index to an Elasticsearch client. Pass a request-scoped client: every
 * caller of this store acts on behalf of a user, so authorization is Elasticsearch's to enforce.
 */
export const createImprovementsClient = (esClient: ElasticsearchClient): ImprovementsClient => ({
  search: (request) =>
    esClient.search<Improvement>({
      index: IMPROVEMENTS_INDEX,
      // The index does not exist until the first improvement is written, and an empty store is a
      // normal state for the review UI to read rather than an error.
      ignore_unavailable: true,
      ...request,
    }),

  bulk: async ({ operations, refresh, throwOnFail = true }) => {
    const response = await esClient.bulk({
      index: IMPROVEMENTS_INDEX,
      refresh,
      operations: operations.flatMap(
        ({ index: { _id, document, if_seq_no: ifSeqNo, if_primary_term: ifPrimaryTerm } }) => [
          {
            index: {
              _id,
              ...(ifSeqNo !== undefined && { if_seq_no: ifSeqNo }),
              ...(ifPrimaryTerm !== undefined && { if_primary_term: ifPrimaryTerm }),
            },
          },
          document,
        ]
      ),
    });

    if (throwOnFail && response.errors) {
      throw new BulkOperationError(
        `Bulk operation on '${IMPROVEMENTS_INDEX}' failed: ${JSON.stringify(
          response.items.filter((item) => Object.values(item).some((action) => action?.error))
        )}`,
        response
      );
    }

    return response;
  },
});
