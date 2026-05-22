/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { SmlTypeDefinition } from '@kbn/agent-context-layer-plugin/server';
import {
  RULE_ATTACHMENT_TYPE,
  RULE_SML_TYPE,
  ruleAttachmentDataSchema,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { RuleSavedObjectAttributes } from '../../saved_objects';
import type { GetScopedRulesClient } from '../scoped_rules_client_factory';

interface CreateRuleSmlTypeOptions {
  getScopedRulesClient: GetScopedRulesClient;
  getInternalRepository: () => ISavedObjectsRepository;
}

export const createRuleSmlType = ({
  getScopedRulesClient,
  getInternalRepository,
}: CreateRuleSmlTypeOptions): SmlTypeDefinition => ({
  id: RULE_SML_TYPE,
  fetchFrequency: () => '1m',

  async *list() {
    const repository = getInternalRepository();
    const finder = repository.createPointInTimeFinder<RuleSavedObjectAttributes>({
      type: RULE_SAVED_OBJECT_TYPE,
      perPage: 1000,
      namespaces: ['*'],
      fields: [],
    });

    try {
      for await (const response of finder.find()) {
        yield response.saved_objects.map((so) => ({
          id: so.id,
          updatedAt: so.updated_at ?? new Date().toISOString(),
          spaces: so.namespaces ?? ['default'],
        }));
      }
    } finally {
      await finder.close();
    }
  },

  getSmlData: async (originId, context) => {
    try {
      const repository = getInternalRepository();
      const so = await repository.get<RuleSavedObjectAttributes>(RULE_SAVED_OBJECT_TYPE, originId);
      const attrs = so.attributes;
      const name = attrs?.metadata?.name ?? originId;
      const description = attrs?.metadata?.description ?? '';
      const tags = attrs?.metadata?.tags?.join(', ') ?? '';
      const kind = attrs?.kind ?? '';
      const query = attrs?.evaluation?.query?.base ?? '';

      const contentParts = [name, description, kind, tags, query].filter(Boolean);

      return {
        chunks: [
          {
            type: RULE_SML_TYPE,
            title: name,
            content: contentParts.join('\n'),
            permissions: [`api:${ALERTING_V2_API_PRIVILEGES.rules.read}`],
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
