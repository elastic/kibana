/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ChangeHistoryDocument } from '@kbn/change-history';
import { DATA_STREAM_NAME as CHANGE_HISTORY_DATA_STREAM } from '@kbn/change-history';
import type { ScoutLogger, ScoutTestConfig } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { RuleChangesHistoryActionType } from '../../../../server/lib/rule_changes_history/audit_actions';
import {
  RULE_CHANGES_HISTORY_DATASET,
  RULE_CHANGES_HISTORY_MODULE,
} from '../../../../common/rule_changes_history_constants';
import { RULE_CHANGES_HISTORY_OBJECT_TYPE } from '../../../../server/lib/rule_changes_history/constants';
import { POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from '../constants';
import { createSystemIndicesEsClient } from './system_indices_es_client';

const DEFAULT_SPACE_ID = 'default';

/**
 * System / restricted data streams additionally require the Kibana
 * product-origin header (same pattern as entity_store Scout helpers and
 * `@kbn/change-history` integration tests).
 */
const CHANGE_HISTORY_ES_HEADERS = {
  'x-elastic-product-origin': 'kibana',
};

export interface RuleChangesHistoryFilter {
  ruleId: string;
  action?: RuleChangesHistoryActionType;
  spaceId?: string;
}

/**
 * Test-time direct-index accessor for the shared `.kibana_change_history` data
 * stream, scoped to alerting_v2 rule lifecycle entries (`event.module:
 * alerting-v2`, `event.dataset: rules`).
 *
 * Use this when a spec needs to assert that RulesClient mutations emit the
 * correctly-shaped change-history documents via the domain-event subscriber.
 */
export interface RuleChangesHistoryApiService {
  /** Search change-history entries for a rule, optionally filtered by action. */
  find: (filter: RuleChangesHistoryFilter) => Promise<ChangeHistoryDocument[]>;
  /** Polls `find(...)` until at least `min` matching entries exist. */
  waitForAtLeast: (min: number, filter: RuleChangesHistoryFilter) => Promise<void>;
  /**
   * Removes alerting-v2 rule change-history documents. Optionally scoped to a
   * single rule id. Never deletes other modules' history.
   */
  cleanUp: (filter?: { ruleId?: string }) => Promise<void>;
}

export const getRuleChangesHistoryApiService = ({
  log,
  esClient,
  config,
}: {
  log: ScoutLogger;
  esClient: EsClient;
  config: ScoutTestConfig;
}): RuleChangesHistoryApiService => {
  let changeHistoryClientPromise: Promise<EsClient> | undefined;

  /**
   * Lazy: provision `system_indices_superuser` once, then return a child client
   * that always sends the product-origin header. Restricted indices reject the
   * plain `elastic` superuser even when the header is present.
   */
  const getChangeHistoryClient = (): Promise<EsClient> => {
    if (!changeHistoryClientPromise) {
      changeHistoryClientPromise = createSystemIndicesEsClient(esClient, config).then((client) =>
        client.child({ headers: CHANGE_HISTORY_ES_HEADERS })
      );
    }
    return changeHistoryClientPromise;
  };

  const find: RuleChangesHistoryApiService['find'] = ({
    ruleId,
    action,
    spaceId = DEFAULT_SPACE_ID,
  }) =>
    measurePerformanceAsync(log, 'ruleChangesHistory.find', async () => {
      const changeHistoryClient = await getChangeHistoryClient();

      await changeHistoryClient.indices.refresh({
        index: CHANGE_HISTORY_DATA_STREAM,
        ignore_unavailable: true,
      });

      const filter: object[] = [
        { term: { 'event.module': RULE_CHANGES_HISTORY_MODULE } },
        { term: { 'event.dataset': RULE_CHANGES_HISTORY_DATASET } },
        { term: { 'object.type': RULE_CHANGES_HISTORY_OBJECT_TYPE } },
        { term: { 'object.id': ruleId } },
        { term: { 'kibana.space_ids': spaceId } },
      ];

      if (action) {
        filter.push({ term: { 'event.action': action } });
      }

      const result = await changeHistoryClient.search<ChangeHistoryDocument>({
        index: CHANGE_HISTORY_DATA_STREAM,
        query: { bool: { filter } },
        sort: [{ '@timestamp': 'asc' }, { 'object.sequence': 'asc' }],
        size: 100,
      });

      return result.hits.hits.map((hit) => hit._source as ChangeHistoryDocument);
    });

  const waitForAtLeast: RuleChangesHistoryApiService['waitForAtLeast'] = (min, filter) =>
    expect
      .poll(() => find(filter).then((entries) => entries.length), {
        timeout: POLL_TIMEOUT_MS,
        intervals: [POLL_INTERVAL_MS],
      })
      .toBeGreaterThanOrEqual(min);

  const cleanUp: RuleChangesHistoryApiService['cleanUp'] = (filter = {}) =>
    measurePerformanceAsync(log, 'ruleChangesHistory.cleanUp', async () => {
      const changeHistoryClient = await getChangeHistoryClient();

      const must: object[] = [{ term: { 'event.module': RULE_CHANGES_HISTORY_MODULE } }];
      if (filter.ruleId) {
        must.push({ term: { 'object.id': filter.ruleId } });
      }

      try {
        await changeHistoryClient.deleteByQuery({
          index: CHANGE_HISTORY_DATA_STREAM,
          query: { bool: { filter: must } },
          refresh: true,
          wait_for_completion: true,
          conflicts: 'proceed',
        });
      } catch (error) {
        // Index / data stream may not exist yet (first run before any history
        // was written). Swallow 404; rethrow everything else.
        if ((error as { meta?: { statusCode?: number } }).meta?.statusCode === 404) {
          return;
        }
        throw error;
      }
    });

  return { find, waitForAtLeast, cleanUp };
};
