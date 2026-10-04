/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../constants';

export interface SeedRuleTemplateParams {
  id: string;
  attributes: Record<string, unknown>;
  spaceId?: string;
}

export interface RuleTemplatesApiService {
  create: (params: SeedRuleTemplateParams) => Promise<void>;
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

    cleanUp: () =>
      measurePerformanceAsync(log, 'ruleTemplates.cleanUp', async () => {
        await kbnClient.savedObjects.clean({
          types: [RULE_TEMPLATE_SAVED_OBJECT_TYPE],
        });
      }),
  };
};
