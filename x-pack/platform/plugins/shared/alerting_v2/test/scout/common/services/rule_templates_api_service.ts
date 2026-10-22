/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import type { CreateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';
import { COMMON_HEADERS, RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../constants';
import { getInstallRuleTemplateUrl } from '../urls';

export interface SeedRuleTemplateParams {
  id: string;
  attributes: Record<string, unknown>;
  spaceId?: string;
}

export interface RuleTemplatesApiService {
  create: (params: SeedRuleTemplateParams) => Promise<void>;
  /** Creates a rule from `data` through the install route, recording `templateId` on it. */
  install: (templateId: string, data: CreateRuleData) => Promise<RuleResponse>;
  cleanUp: () => Promise<void>;
}

/**
 * Seeds and cleans `alerting_rule_template` saved objects via the FTR SO client
 * (`/internal/ftr/kbn_client_so`). Templates are normally installed by Fleet
 * packages, so the specs seed them here rather than through a public write API.
 *
 * Prefer this over direct ES writes: `.kibana_alerting_cases` is a restricted
 * index, and serverless rejects `delete_by_query` from the default test
 * superuser even with the Kibana product-origin header.
 */
export const getRuleTemplatesApiService = ({
  log,
  kbnClient,
}: {
  log: ScoutLogger;
  kbnClient: KbnClient;
}): RuleTemplatesApiService => {
  return {
    create: ({ id, attributes, spaceId }) =>
      measurePerformanceAsync(log, 'ruleTemplates.create', async () => {
        await kbnClient.savedObjects.create({
          type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
          id,
          attributes,
          overwrite: true,
          ...(spaceId ? { space: spaceId } : {}),
        });
      }),

    install: (templateId, data) =>
      measurePerformanceAsync(log, 'ruleTemplates.install', async () => {
        const response = await kbnClient.request<RuleResponse>({
          method: 'POST',
          path: getInstallRuleTemplateUrl(templateId),
          headers: COMMON_HEADERS,
          body: data,
        });
        return response.data;
      }),

    cleanUp: () =>
      measurePerformanceAsync(log, 'ruleTemplates.cleanUp', async () => {
        await kbnClient.savedObjects.clean({
          types: [RULE_TEMPLATE_SAVED_OBJECT_TYPE],
        });
      }),
  };
};
