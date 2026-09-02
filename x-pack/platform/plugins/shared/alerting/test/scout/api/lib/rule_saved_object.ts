/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { expect } from '@kbn/scout/api';

const ALERTING_SO_INDEX = '.kibana_alerting_cases_1';

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
        timeout: 60_000,
        intervals: [1_000],
        message: `Rule ${ruleId} kept being written to`,
      }
    )
    .toBe(true);
};
