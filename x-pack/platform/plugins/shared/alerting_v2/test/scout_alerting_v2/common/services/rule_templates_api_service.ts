/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../constants';

const DEFAULT_SPACE_ID = 'default';

const SAVED_OBJECT_ES_HEADERS = {
  'x-elastic-product-origin': 'kibana',
};

/** Earliest model version that accepts the `engine: "v2"` template shape. */
const TYPE_MIGRATION_VERSION = '10.4.0';

export interface SeedRuleTemplateParams {
  id: string;
  attributes: Record<string, unknown>;
  spaceId?: string;
}

export interface RuleTemplatesApiService {
  create: (params: SeedRuleTemplateParams) => Promise<void>;
  cleanUp: () => Promise<void>;
}

export const getRuleTemplatesApiService = ({
  log,
  esClient,
}: {
  log: ScoutLogger;
  esClient: EsClient;
}): RuleTemplatesApiService => {
  const client = esClient.child({ headers: SAVED_OBJECT_ES_HEADERS });

  return {
    create: ({ id, attributes, spaceId = DEFAULT_SPACE_ID }) =>
      measurePerformanceAsync(log, 'ruleTemplates.create', async () => {
        const now = new Date().toISOString();

        await client.index({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: `${RULE_TEMPLATE_SAVED_OBJECT_TYPE}:${id}`,
          document: {
            [RULE_TEMPLATE_SAVED_OBJECT_TYPE]: attributes,
            type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
            references: [],
            managed: false,
            namespaces: [spaceId],
            coreMigrationVersion: '8.8.0',
            typeMigrationVersion: TYPE_MIGRATION_VERSION,
            created_at: now,
            updated_at: now,
          },
          refresh: 'wait_for',
        });
      }),

    cleanUp: () =>
      measurePerformanceAsync(log, 'ruleTemplates.cleanUp', async () => {
        await client.deleteByQuery({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: { term: { type: RULE_TEMPLATE_SAVED_OBJECT_TYPE } },
          refresh: true,
          wait_for_completion: true,
          conflicts: 'proceed',
        });
      }),
  };
};
