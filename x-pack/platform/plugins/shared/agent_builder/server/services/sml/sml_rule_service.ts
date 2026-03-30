/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SmlRuleType, SmlRuleVariable } from '../../../common/http_api/sml_rules';
import {
  createSmlRuleStorage,
  type SmlRuleStorage,
  type SmlRuleDocument,
} from './sml_rule_storage';
import { isNotFoundError } from './sml_service';

/** Document ID convention: `{type}:{ruleId}` */
const toDocId = (type: string, ruleId: string): string => `${type}:${ruleId}`;

export interface SmlRuleServiceStartDeps {
  logger: Logger;
  elasticsearch: { client: { asInternalUser: ElasticsearchClient } };
  spaces?: SpacesPluginStart;
}

export interface SmlRuleService {
  createOrUpdate: (params: {
    type: SmlRuleType;
    ruleId: string;
    body: {
      name: string;
      index_pattern: string;
      prompt?: string;
      inference_id: string;
      variables?: Record<string, SmlRuleVariable>;
    };
    request: KibanaRequest;
  }) => Promise<SmlRuleDocument>;

  get: (params: {
    type: SmlRuleType;
    ruleId: string;
    request: KibanaRequest;
  }) => Promise<SmlRuleDocument>;

  list: (params: { type: SmlRuleType; request: KibanaRequest }) => Promise<SmlRuleDocument[]>;

  delete: (params: {
    type: SmlRuleType;
    ruleId: string;
    request: KibanaRequest;
  }) => Promise<{ success: boolean }>;
}

export const createSmlRuleService = ({
  logger,
  elasticsearch,
  spaces,
}: SmlRuleServiceStartDeps): SmlRuleService => {
  const getStorage = (): SmlRuleStorage => {
    return createSmlRuleStorage({
      logger,
      esClient: elasticsearch.client.asInternalUser,
    });
  };

  const getSpaceId = (request: KibanaRequest): string => {
    return spaces?.spacesService?.getSpaceId(request) ?? 'default';
  };

  return {
    createOrUpdate: async ({ type, ruleId, body, request }) => {
      const storage = getStorage();
      const client = storage.getClient();
      const spaceId = getSpaceId(request);
      const docId = toDocId(type, ruleId);

      const now = new Date().toISOString();

      // Check if the document already exists to preserve created_at
      let createdAt = now;
      try {
        const existing = await client.get({ id: docId });
        if (existing._source?.created_at) {
          createdAt = existing._source.created_at;
        }
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }

      const document: SmlRuleDocument = {
        id: ruleId,
        name: body.name,
        type,
        index_pattern: body.index_pattern,
        prompt: body.prompt,
        inference_id: body.inference_id,
        variables: body.variables,
        space: spaceId,
        created_at: createdAt,
        updated_at: now,
      };

      await client.index({
        id: docId,
        document,
      });

      return document;
    },

    get: async ({ type, ruleId, request }) => {
      const storage = getStorage();
      const client = storage.getClient();
      const spaceId = getSpaceId(request);
      const docId = toDocId(type, ruleId);

      const result = await client.search({
        track_total_hits: false,
        size: 1,
        query: {
          bool: {
            filter: [{ term: { _id: docId } }, { term: { space: spaceId } }],
          },
        },
      });

      const hit = result.hits.hits[0];
      if (!hit?._source) {
        throw new SmlRuleNotFoundError(ruleId);
      }

      return hit._source;
    },

    list: async ({ type, request }) => {
      const storage = getStorage();
      const client = storage.getClient();
      const spaceId = getSpaceId(request);

      const result = await client.search({
        track_total_hits: true,
        size: 1000,
        query: {
          bool: {
            filter: [{ term: { type } }, { term: { space: spaceId } }],
          },
        },
        sort: [{ updated_at: { order: 'desc' } }],
      });

      return result.hits.hits.filter((hit) => hit._source != null).map((hit) => hit._source!);
    },

    delete: async ({ type, ruleId, request }) => {
      const storage = getStorage();
      const client = storage.getClient();
      const spaceId = getSpaceId(request);
      const docId = toDocId(type, ruleId);

      // Verify the rule exists in this space before deleting
      const result = await client.search({
        track_total_hits: false,
        size: 1,
        query: {
          bool: {
            filter: [{ term: { _id: docId } }, { term: { space: spaceId } }],
          },
        },
      });

      const hit = result.hits.hits[0];
      if (!hit) {
        throw new SmlRuleNotFoundError(ruleId);
      }

      const deleteResult = await client.delete({ id: docId });
      return { success: deleteResult.result === 'deleted' };
    },
  };
};

export class SmlRuleNotFoundError extends Error {
  public readonly statusCode = 404;
  constructor(ruleId: string) {
    super(`SML rule '${ruleId}' not found`);
    this.name = 'SmlRuleNotFoundError';
  }
}
