/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { expect } from '@kbn/scout/api';

const ALERTING_SO_INDEX = '.kibana_alerting_cases_1';
const PENDING_INVALIDATION_SO_TYPE = 'api_key_pending_invalidation';

export interface RuleSavedObjectAttributes {
  apiKey: string | null;
  apiKeyOwner: string | null;
  apiKeyCreatedByUser: boolean | null;
  uiamApiKey?: string | null;
  uiamApiKeyExternal?: boolean | null;
  enabled: boolean;
  tags: string[];
}

/**
 * Reads a rule's raw saved-object attributes straight from Elasticsearch.
 *
 * The alerting APIs never return the stored API keys, and a plain saved-objects read strips
 * encrypted attributes, so this is the only way to assert on what a rule actually holds.
 */
export const getRuleSavedObjectAttributes = async (
  esClient: Client,
  ruleId: string
): Promise<RuleSavedObjectAttributes> => {
  const { _source } = await esClient.get({
    index: ALERTING_SO_INDEX,
    id: `alert:${ruleId}`,
  });
  expect(_source).toBeDefined();
  return (_source as { alert: RuleSavedObjectAttributes }).alert;
};

/**
 * Waits until the rule's saved object stops being written to.
 *
 * A finishing rule execution writes its outcome back to the rule, and the alerting write paths
 * use optimistic concurrency: a write that lands in between makes an API key rotation abandon the
 * keys it had just minted, queue them for invalidation, and retry, so twice as many keys end up
 * pending invalidation as the rotation itself accounts for. Waiting for the document version to
 * settle leaves the rotation as the only writer.
 */
export const waitForQuietRuleSavedObject = async (esClient: Client, ruleId: string) => {
  let previousVersion: number | undefined;

  await expect
    .poll(
      async () => {
        const { _version: version } = await esClient.get({
          index: ALERTING_SO_INDEX,
          id: `alert:${ruleId}`,
        });
        const settled = version !== undefined && version === previousVersion;
        previousVersion = version;
        return settled;
      },
      {
        // The write being waited out lands within a second or two of the execution finishing, so
        // a modest budget is enough and leaves the rest of the test's time to the rotation.
        timeout: 30_000,
        intervals: [1_000],
        message: `Rule ${ruleId} kept being written to`,
      }
    )
    .toBe(true);
};

/**
 * Counts the API keys queued for invalidation since the given moment.
 *
 * `api_key_pending_invalidation` objects are deployment-wide and hold their key material
 * encrypted, so a queued key cannot be traced back to the rule it came from. Scoping the count to
 * a window that opens right before an operation is what keeps the assertion about that operation
 * rather than about every suite that has run against the deployment, and it means a suite never
 * has to delete entries other suites are relying on. Nothing removes these entries mid-test: the
 * invalidation task only collects ones older than
 * `xpack.alerting.invalidateApiKeysTask.removalDelay`, an hour by default.
 *
 * The entries are searchable as soon as the operation that queued them responds, because the
 * saved-objects client writes with `refresh: wait_for`. Do not try to refresh the index here: it is
 * restricted, and `indices:admin/refresh` on it is denied even to a superuser.
 */
export const countApiKeysQueuedForInvalidationSince = async (
  esClient: Client,
  since: string
): Promise<number> => {
  const { count } = await esClient.count({
    index: ALERTING_SO_INDEX,
    query: {
      bool: {
        filter: [
          { term: { type: PENDING_INVALIDATION_SO_TYPE } },
          { range: { [`${PENDING_INVALIDATION_SO_TYPE}.createdAt`]: { gte: since } } },
        ],
      },
    },
  });

  return count;
};
