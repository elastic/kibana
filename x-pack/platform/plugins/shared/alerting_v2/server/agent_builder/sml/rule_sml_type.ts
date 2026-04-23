/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { SmlTypeDefinition, SmlListItem } from '@kbn/agent-builder-plugin/server';
import {
  RULE_ATTACHMENT_TYPE,
  RULE_SML_TYPE,
  ruleAttachmentDataSchema,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { RuleSavedObjectAttributes } from '../../saved_objects';
import type { GetScopedRulesClient } from '../scoped_rules_client_factory';

interface CreateRuleSmlTypeOptions {
  getScopedRulesClient: GetScopedRulesClient;
}

export const createRuleSmlType = ({
  getScopedRulesClient,
}: CreateRuleSmlTypeOptions): SmlTypeDefinition => ({
  id: RULE_SML_TYPE,
  fetchFrequency: () => '15m',

  // alerting_rule is a hidden SO type — the generic savedObjectsClient cannot
  // access it. Query the underlying ES index directly instead.
  // alerting_rule is a hidden SO type — the generic savedObjectsClient cannot
  // access it. Query the underlying ES index directly instead.
  async *list(context) {
    const pageSize = 1000;
    let searchAfter: SortResults | undefined;

    while (true) {
      const response = await context.esClient.search({
        index: `${ALERTING_CASES_SAVED_OBJECT_INDEX}*`,
        size: pageSize,
        _source: ['updated_at', 'namespaces'],
        query: { term: { type: RULE_SAVED_OBJECT_TYPE } },
        sort: [{ _id: 'asc' }],
        ...(searchAfter ? { search_after: searchAfter } : {}),
      });

      const hits = response.hits.hits;
      if (hits.length === 0) break;

      const items: SmlListItem[] = [];
      for (const hit of hits) {
        if (!hit._id) continue;
        const src = hit._source as { updated_at?: string; namespaces?: string[] };
        const prefix = `${RULE_SAVED_OBJECT_TYPE}:`;
        const id = hit._id.startsWith(prefix) ? hit._id.slice(prefix.length) : hit._id;
        items.push({
          id,
          updatedAt: src.updated_at ?? new Date().toISOString(),
          spaces: src.namespaces ?? ['default'],
        });
      }
      yield items;

      if (hits.length < pageSize) break;
      searchAfter = hits[hits.length - 1].sort as SortResults;
    }
  },

  getSmlData: async (originId, context) => {
    try {
      const response = await context.esClient.get({
        index: `${ALERTING_CASES_SAVED_OBJECT_INDEX}*`,
        id: `${RULE_SAVED_OBJECT_TYPE}:${originId}`,
      });
      const attrs = (
        response._source as { [key: string]: RuleSavedObjectAttributes }
      )[RULE_SAVED_OBJECT_TYPE];
      const name = attrs?.metadata?.name ?? originId;
      const description = attrs.metadata?.description ?? '';
      const tags = attrs.metadata?.tags?.join(', ') ?? '';
      const kind = attrs.kind ?? '';
      const query = attrs.evaluation?.query?.base ?? '';

      const contentParts = [name, description, kind, tags, query].filter(Boolean);

      return {
        chunks: [
          {
            type: RULE_SML_TYPE,
            title: name,
            content: contentParts.join('\n'),
            permissions: [`saved_object:${RULE_SAVED_OBJECT_TYPE}/get`],
          },
        ],
      };
    } catch (error) {
      context.logger.warn(
        `SML rule: failed to get data for '${originId}': ${(error as Error).message}`
      );
      return undefined;
    }
  },

  toAttachment: async (item, context) => {
    try {
      const rulesClient = getScopedRulesClient(context.request);
      const rule = await rulesClient.getRule({ id: item.origin_id });
      return {
        type: RULE_ATTACHMENT_TYPE,
        data: ruleAttachmentDataSchema.parse(rule),
      };
    } catch {
      return undefined;
    }
  },
});
