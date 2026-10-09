/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { ScoutLogger, ScoutTestConfig } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import { ACTION_POLICY_SAVED_OBJECT_TYPE } from '../../../../common/saved_object_types';
import type { ActionPolicySavedObjectAttributes } from '../../../../server/saved_objects';
import { createSystemIndicesEsClient } from './system_indices_es_client';

/**
 * System / restricted indices additionally require the Kibana product-origin
 * header (same pattern as `rule_saved_object_service`).
 */
const SAVED_OBJECT_ES_HEADERS = {
  'x-elastic-product-origin': 'kibana',
};

const DEFAULT_SPACE_ID = 'default';

/**
 * `namespaceType: 'multiple-isolated'` prefixes the raw document id with the
 * space for every space except the default one.
 */
const getDocumentId = (policyId: string, spaceId: string): string =>
  spaceId === DEFAULT_SPACE_ID
    ? `${ACTION_POLICY_SAVED_OBJECT_TYPE}:${policyId}`
    : `${spaceId}:${ACTION_POLICY_SAVED_OBJECT_TYPE}:${policyId}`;

/**
 * Test-time direct-index accessor for the action policy saved object. The type is `hidden: true`,
 * so the saved objects HTTP API cannot reach it, and specs that need the stored attributes before
 * the response projection have to read the raw document.
 */
export interface ActionPolicySavedObjectService {
  /**
   * Reads the raw stored attributes of an action policy. Use it to assert what a write actually
   * persisted: the response projection turns the stored `null` sentinels into absent keys, so a
   * field cleared on disk is indistinguishable from one that was never set.
   *
   * `apiKey` comes back as the encrypted blob, which is what is on disk.
   */
  getAttributes: (policyId: string, spaceId?: string) => Promise<ActionPolicySavedObjectAttributes>;
}

export const getActionPolicySavedObjectService = ({
  log,
  esClient,
  config,
}: {
  log: ScoutLogger;
  esClient: EsClient;
  config: ScoutTestConfig;
}): ActionPolicySavedObjectService => {
  let savedObjectClientPromise: Promise<EsClient> | undefined;

  /**
   * Lazy: provision `system_indices_superuser` once, then return a child client that always sends
   * the product-origin header. `.kibana_alerting_cases` is a restricted index.
   */
  const getSavedObjectClient = (): Promise<EsClient> => {
    if (!savedObjectClientPromise) {
      savedObjectClientPromise = createSystemIndicesEsClient(esClient, config).then((client) =>
        client.child({ headers: SAVED_OBJECT_ES_HEADERS })
      );
    }
    return savedObjectClientPromise;
  };

  return {
    getAttributes: (policyId, spaceId = DEFAULT_SPACE_ID) =>
      measurePerformanceAsync(log, 'actionPolicySavedObject.getAttributes', async () => {
        const client = await getSavedObjectClient();
        const response = await client.get<Record<string, ActionPolicySavedObjectAttributes>>({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: getDocumentId(policyId, spaceId),
          _source_includes: [ACTION_POLICY_SAVED_OBJECT_TYPE],
        });

        const attributes = response._source?.[ACTION_POLICY_SAVED_OBJECT_TYPE];
        if (!attributes) {
          throw new Error(
            `Action policy saved object "${policyId}" has no ${ACTION_POLICY_SAVED_OBJECT_TYPE} source`
          );
        }

        return attributes;
      }),
  };
};
