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
import type { SmlRule } from '@kbn/agent-builder-common';
import { createSmlRuleNotFoundError } from '@kbn/agent-builder-common';
import type { SmlRuleCreateBody } from '../../../common/http_api/sml_rules';
import type { SmlRulesService, SmlRulesClient } from './types';
import { createSmlRulesStorage } from './storage';

const isNotFoundError = (error: unknown): boolean => {
  return error instanceof errors.ResponseError && error.statusCode === 404;
};

const createSmlRulesClient = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): SmlRulesClient => {
  const storage = createSmlRulesStorage({ logger, esClient });

  return {
    async createOrUpdate(id: string, body: SmlRuleCreateBody): Promise<SmlRule> {
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

      const document: SmlRule = {
        ...body,
        id,
        created_at: createdAt,
        updated_at: now,
      };

      await storage.getClient().index({
        id,
        document,
      });

      return document;
    },

    async get(id: string): Promise<SmlRule> {
      try {
        const result = await storage.getClient().get({ id });
        if (!result._source) {
          throw createSmlRuleNotFoundError({ ruleId: id });
        }
        return result._source;
      } catch (error) {
        if (isNotFoundError(error)) {
          throw createSmlRuleNotFoundError({ ruleId: id });
        }
        throw error;
      }
    },

    async list(): Promise<SmlRule[]> {
      const response = await storage.getClient().search({
        track_total_hits: false,
        size: 1000,
        query: { match_all: {} },
      });

      return response.hits.hits
        .map((hit) => hit._source)
        .filter((source): source is SmlRule => source !== undefined);
    },

    async delete(id: string): Promise<boolean> {
      try {
        const { result } = await storage.getClient().delete({ id });
        return result === 'deleted';
      } catch (error) {
        if (isNotFoundError(error)) {
          throw createSmlRuleNotFoundError({ ruleId: id });
        }
        throw error;
      }
    },
  };
};

export class SmlRulesServiceImpl implements SmlRulesService {
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

  getScopedClient({ request }: { request: KibanaRequest }): SmlRulesClient {
    const esClient = this.elasticsearch.client.asScoped(request).asInternalUser;
    return createSmlRulesClient({ logger: this.logger, esClient });
  }
}
