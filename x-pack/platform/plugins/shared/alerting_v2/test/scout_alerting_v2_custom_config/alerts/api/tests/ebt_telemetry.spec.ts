/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Asserts the EBT events produced when an alert action is applied. The ack
 * requests go through `apiClient`; alert events are seeded through `apiServices`.
 */

import { randomUUID } from 'crypto';
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { ALERT_ACK_ACTION_APPLIED_EBT_EVENT_TYPE } from '../../../../../server/lib/telemetry/alert_action_ebt_schema';
import {
  ALERTING_V2_ALERTS_ALL_ROLE,
  apiTest,
  buildAlertEvent,
  buildGroupHash,
  BULK_ACK_EPISODE_ACTION_URL,
  getAckEpisodeActionUrl,
  testData,
  type AlertingApiServicesFixture,
} from '../fixtures';

// The API key request is not a browser request, so it is reported on the `api` channel with no app.
const API_ORIGIN = { actor: 'user', channel: 'api' } as const;

// Rule ids are created inside each test. The analytics buffer keeps events for a
// rule id across runs, and these hooks delete only the ids this file created.
const createdRuleIds: string[] = [];

const cleanCreatedRules = async (apiServices: AlertingApiServicesFixture) => {
  for (const ruleId of createdRuleIds) {
    await apiServices.alertingV2.ruleEvents.cleanUp({ ruleId });
    await apiServices.alertingV2.alertActionsEvents.cleanUp({ ruleId });
  }
};

apiTest.describe('Alert action EBT telemetry', { tag: ['@local-stateful-classic'] }, () => {
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ apiServices, requestAuth }) => {
    const writerCredentials: RoleApiCredentials = await requestAuth.getApiKeyForCustomRole(
      ALERTING_V2_ALERTS_ALL_ROLE
    );
    writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };
    await apiServices.alertingV2.ebt.optIn();
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await cleanCreatedRules(apiServices);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    try {
      await cleanCreatedRules(apiServices);
    } finally {
      await apiServices.alertingV2.ebt.optOut();
    }
  });

  apiTest('reports a single ack', async ({ apiClient, apiServices }) => {
    const ruleId = `ebt-ack-rule-${randomUUID()}`;
    createdRuleIds.push(ruleId);
    const episodeId = `ebt-ack-episode-${randomUUID()}`;
    await apiServices.alertingV2.ruleEvents.seed([
      buildAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: buildGroupHash(episodeId),
        alert: { id: episodeId, status: 'active' },
      }),
    ]);

    const response = await apiClient.post(getAckEpisodeActionUrl(episodeId), {
      headers: writerHeaders,
      body: {},
    });
    expect(response).toHaveStatusCode(204);

    const [event] = await apiServices.alertingV2.ebt.waitForAlertActionEvents({
      ruleId,
      eventType: ALERT_ACK_ACTION_APPLIED_EBT_EVENT_TYPE,
    });
    expect(event.event_type).toBe(ALERT_ACK_ACTION_APPLIED_EBT_EVENT_TYPE);
    expect(event.properties).toMatchObject({
      space_id: 'default',
      rule_id: ruleId,
      origin: API_ORIGIN,
      alert_count: 1,
    });
    expect(event.properties.origin.app).toBeUndefined();
  });

  apiTest('reports a bulk ack as one event for the rule', async ({ apiClient, apiServices }) => {
    const ruleId = `ebt-bulk-ack-rule-${randomUUID()}`;
    createdRuleIds.push(ruleId);
    const episodeIdOne = `ebt-bulk-ack-episode-one-${randomUUID()}`;
    const episodeIdTwo = `ebt-bulk-ack-episode-two-${randomUUID()}`;
    await apiServices.alertingV2.ruleEvents.seed([
      buildAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: buildGroupHash(episodeIdOne),
        alert: { id: episodeIdOne, status: 'active' },
      }),
      buildAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: buildGroupHash(episodeIdTwo),
        alert: { id: episodeIdTwo, status: 'active' },
      }),
    ]);

    const response = await apiClient.post(BULK_ACK_EPISODE_ACTION_URL, {
      headers: writerHeaders,
      body: { items: [{ alert_id: episodeIdOne }, { alert_id: episodeIdTwo }] },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ affected_count: 2, errors: [] });

    const [event] = await apiServices.alertingV2.ebt.waitForAlertActionEvents({
      ruleId,
      eventType: ALERT_ACK_ACTION_APPLIED_EBT_EVENT_TYPE,
    });
    expect(event.properties).toMatchObject({
      space_id: 'default',
      rule_id: ruleId,
      origin: API_ORIGIN,
      alert_count: 2,
    });
    expect(event.properties.origin.app).toBeUndefined();

    // `count: 1` returns as soon as the first event arrives, so it cannot
    // tell one grouped event from one event per alert. A second event must
    // not show up.
    await expect(
      apiServices.alertingV2.ebt.waitForAlertActionEvents({
        ruleId,
        eventType: ALERT_ACK_ACTION_APPLIED_EBT_EVENT_TYPE,
        count: 2,
        timeoutMs: 500,
      })
    ).rejects.toThrow('received 1');
  });
});
