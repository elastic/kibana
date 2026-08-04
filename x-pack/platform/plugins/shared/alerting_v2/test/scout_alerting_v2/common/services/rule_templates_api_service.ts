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

/**
 * Saved object indices are system indices; writing to them from tests requires
 * the Kibana product-origin header to avoid being rejected as an external
 * write.
 */
const SAVED_OBJECT_ES_HEADERS = {
  'x-elastic-product-origin': 'kibana',
};

/**
 * Type migration version stamped on seeded templates. Model version 4 is where
 * the `engine: "v2"` template shape was introduced, so it is the earliest
 * version these documents are valid under. Later model versions are applied on
 * read, which keeps this constant correct as new ones are added — it only has
 * to stay at or below the version Kibana is running.
 */
const TYPE_MIGRATION_VERSION = '10.4.0';

export interface SeedRuleTemplateParams {
  id: string;
  /** Stored attributes. Deliberately untyped so specs can seed invalid content. */
  attributes: Record<string, unknown>;
  spaceId?: string;
}

/**
 * Test-time seeding for the `alerting_rule_template` saved objects the v2 read
 * APIs serve.
 *
 * Templates are installed by Fleet packages in production and there is no write
 * API, so specs index the saved objects directly. The type is hidden and shared
 * with alerting v1, which is also why this cannot go through the saved objects
 * HTTP API.
 */
export interface RuleTemplatesApiService {
  /** Indexes a rule template saved object with the given attributes. */
  create: (params: SeedRuleTemplateParams) => Promise<void>;
  /** Removes every rule template saved object. */
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
