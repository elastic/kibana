/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  ElasticsearchServiceStart,
} from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import { errors } from '@elastic/elasticsearch';
import { createSmlRecordNotFoundError } from '@kbn/agent-builder-common';
import type { SmlDocument } from '../sml/types';
import type { SmlRecordCreateBody } from '../../../common/http_api/sml_records';
import type { SmlRecordsService, SmlRecordsClient } from './types';
import { createSmlRecordsStorage, smlRecordsIndexName } from './storage';

const isNotFoundError = (error: unknown): boolean => {
  return error instanceof errors.ResponseError && error.statusCode === 404;
};

const createSmlRecordsClient = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): SmlRecordsClient => {
  const storage = createSmlRecordsStorage({ logger, esClient });

  return {
    async createOrUpdate(id: string, body: SmlRecordCreateBody): Promise<SmlDocument> {
      const now = new Date().toISOString();

      let createdAt = now;
      try {
        const existing = await storage.getClient().get({ id });
        if (existing._source?.created_at) {
          createdAt = existing._source.created_at;
        }
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
        // Document doesn't exist yet — this is a create, not update
      }

      const document: SmlDocument = {
        id,
        type: body.type,
        title: body.title,
        origin_id: body.origin_id,
        content: body.content,
        spaces: body.spaces,
        permissions: body.permissions ?? [],
        tags: body.tags ?? [],
        params: body.params,
        user_defined: true,
        semantic_title: body.title,
        semantic_content: body.content,
        created_at: createdAt,
        updated_at: now,
      };

      await storage.getClient().index({ id, document });

      return document;
    },

    async get(id: string): Promise<SmlDocument> {
      try {
        const response = await esClient.search<SmlDocument>({
          index: smlRecordsIndexName,
          size: 1,
          allow_no_indices: true,
          ignore_unavailable: true,
          query: { term: { id } },
        });

        const hit = response.hits.hits[0];
        if (!hit?._source) {
          throw createSmlRecordNotFoundError({ recordId: id });
        }

        return mapSourceToDocument(hit._source);
      } catch (error) {
        if (isNotFoundError(error)) {
          throw createSmlRecordNotFoundError({ recordId: id });
        }
        throw error;
      }
    },

    async delete(id: string): Promise<boolean> {
      try {
        const { result } = await storage.getClient().delete({ id });
        return result === 'deleted';
      } catch (error) {
        if (isNotFoundError(error)) {
          throw createSmlRecordNotFoundError({ recordId: id });
        }
        throw error;
      }
    },
  };
};

/**
 * Map an Elasticsearch _source to an SmlDocument, including optional fields.
 */
const mapSourceToDocument = (source: SmlDocument): SmlDocument => ({
  id: source.id ?? '',
  type: source.type ?? '',
  title: source.title ?? '',
  origin_id: source.origin_id ?? '',
  content: source.content ?? '',
  created_at: source.created_at ?? '',
  updated_at: source.updated_at ?? '',
  spaces: source.spaces ?? [],
  permissions: source.permissions ?? [],
  tags: source.tags,
  user_defined: source.user_defined,
  params: source.params,
  semantic_title: source.semantic_title,
  semantic_content: source.semantic_content,
});

export class SmlRecordsServiceImpl implements SmlRecordsService {
  private readonly logger: Logger;
  private readonly elasticsearch: ElasticsearchServiceStart;

  constructor({
    logger,
    elasticsearch,
  }: {
    logger: Logger;
    elasticsearch: ElasticsearchServiceStart;
  }) {
    this.logger = logger;
    this.elasticsearch = elasticsearch;
  }

  getScopedClient({ request }: { request: KibanaRequest }): SmlRecordsClient {
    const esClient = this.elasticsearch.client.asScoped(request).asInternalUser;
    return createSmlRecordsClient({ logger: this.logger, esClient });
  }
}
