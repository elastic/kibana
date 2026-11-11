/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Asserts the EBT events produced when an alert action is applied, not the
 * HTTP contract of the alert-actions API. Acks go through
 * `apiServices.alertingV2.alertActions`, so the apiClient requirement does
 * not apply.
 */

/* eslint-disable @kbn/eslint/scout_require_api_client_in_api_test */

import { randomUUID } from 'crypto';
import { expect } from '@kbn/scout/api';
import { ALERT_ACK_ACTION_APPLIED_EBT_EVENT_TYPE } from '../../../../../server/lib/telemetry/alert_action_ebt_schema';
import {
  apiTest,
  buildAlertEvent,
  buildGroupHash,
  type AlertingApiServicesFixture,
} from '../fixtures';

// The service request is not a browser request, so it is reported on the `api` channel with no app.
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
  apiTest.beforeAll(async ({ apiServices }) => {
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

  apiTest('reports a single ack', async ({ apiServices }) => {
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

    await apiServices.alertingV2.alertActions.ack({ episodeId });

    const [event] = await apiServices.alertingV2.ebt.waitForAlertActionEvents({
      ruleId,
      eventType: ALERT_ACK_ACTION_APPLIED_EBT_EVENT_TYPE,
    });
    expect(event.event_type).toBe(ALERT_ACK_ACTION_APPLIED_EBT_EVENT_TYPE);
    expect(event.properties).toMatchObject({
      space_id: 'default',
      rule_id: ruleId,
      origin: API_ORIGIN,
    });
    expect(event.properties.origin.app).toBeUndefined();
  });

  apiTest('reports a bulk ack as one event per alert', async ({ apiServices }) => {
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

    const response = await apiServices.alertingV2.alertActions.bulkAck({
      items: [{ alert_id: episodeIdOne }, { alert_id: episodeIdTwo }],
    });
    expect(response).toStrictEqual({ affected_count: 2, errors: [] });

    const events = await apiServices.alertingV2.ebt.waitForAlertActionEvents({
      ruleId,
      eventType: ALERT_ACK_ACTION_APPLIED_EBT_EVENT_TYPE,
      count: 2,
    });
    expect(events).toHaveLength(2);
    for (const event of events) {
      expect(event.properties).toMatchObject({
        space_id: 'default',
        rule_id: ruleId,
        origin: API_ORIGIN,
      });
      expect(event.properties.origin.app).toBeUndefined();
    }
  });
});
