/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { SavedObjectReference } from '@kbn/core-saved-objects-server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { ScoutLogger, ScoutTestConfig } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../common/saved_object_types';
import { createSystemIndicesEsClient } from './system_indices_es_client';

/**
 * System / restricted indices additionally require the Kibana product-origin
 * header (same pattern as `rule_changes_history_service`).
 */
const SAVED_OBJECT_ES_HEADERS = {
  'x-elastic-product-origin': 'kibana',
};

const DEFAULT_SPACE_ID = 'default';

/**
 * `namespaceType: 'multiple-isolated'` prefixes the raw document id with the
 * space for every space except the default one.
 */
const getDocumentId = (ruleId: string, spaceId: string): string =>
  spaceId === DEFAULT_SPACE_ID
    ? `${RULE_SAVED_OBJECT_TYPE}:${ruleId}`
    : `${spaceId}:${RULE_SAVED_OBJECT_TYPE}:${ruleId}`;

/**
 * Test-time direct-index accessor for the rule saved object. The type is
 * `hidden: true`, so the saved objects HTTP API cannot reach it and specs that
 * need framework-owned fields the rule API never returns — namely
 * `references[]` — have to read the raw document.
 */
export interface RuleSavedObjectService {
  /** Reads the raw `references[]` of a rule saved object. */
  getReferences: (ruleId: string, spaceId?: string) => Promise<SavedObjectReference[]>;
  /**
   * Overwrites the raw `references[]` of a rule saved object, which is how a
   * saved-object import remaps the ids an artifact points at. Use it to set up
   * the post-import state without running an actual import.
   */
  setReferences: (
    ruleId: string,
    references: SavedObjectReference[],
    spaceId?: string
  ) => Promise<void>;
}

export const getRuleSavedObjectService = ({
  log,
  esClient,
  config,
}: {
  log: ScoutLogger;
  esClient: EsClient;
  config: ScoutTestConfig;
}): RuleSavedObjectService => {
  let savedObjectClientPromise: Promise<EsClient> | undefined;

  /**
   * Lazy: provision `system_indices_superuser` once, then return a child client
   * that always sends the product-origin header. `.kibana_alerting_cases` is a
   * restricted index, so the plain `elastic` superuser can read it but is
   * denied writes even with the header.
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
    getReferences: (ruleId, spaceId = DEFAULT_SPACE_ID) =>
      measurePerformanceAsync(log, 'ruleSavedObject.getReferences', async () => {
        const client = await getSavedObjectClient();
        const response = await client.get<{ references?: SavedObjectReference[] }>({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: getDocumentId(ruleId, spaceId),
          _source_includes: ['references'],
        });

        return response._source?.references ?? [];
      }),

    setReferences: (ruleId, references, spaceId = DEFAULT_SPACE_ID) =>
      measurePerformanceAsync(log, 'ruleSavedObject.setReferences', async () => {
        const client = await getSavedObjectClient();
        await client.update({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: getDocumentId(ruleId, spaceId),
          doc: { references },
          refresh: 'wait_for',
        });
      }),
  };
};
