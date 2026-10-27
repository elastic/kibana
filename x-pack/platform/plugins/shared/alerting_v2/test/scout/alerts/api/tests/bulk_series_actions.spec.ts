/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  ALERTING_V2_ALERTS_ALL_ROLE,
  ALERTING_V2_ALERTS_READ_ROLE,
  apiTest,
  buildAlertEvent,
  buildGroupHash,
  buildSeriesId,
  BULK_SNOOZE_SERIES_ACTION_URL,
  BULK_UNSNOOZE_SERIES_ACTION_URL,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

const buildUnknownSeriesId = (seed: string): string =>
  buildSeriesId(
    buildAlertEvent({
      rule: { id: 'bulk-series-unknown-rule', version: 1 },
      group_hash: buildGroupHash(seed),
    })
  );

const ANY_SERIES_ID = buildSeriesId(
  buildAlertEvent({
    rule: { id: 'any-rule', version: 1 },
    group_hash: buildGroupHash('any-group'),
  })
);

apiTest.describe('Bulk series actions API', { tag: testData.API_ENGINE_TAG }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_ALERTS_ALL_ROLE);
    writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleEvents.cleanUp();
    await apiServices.alertingV2.alertActionsEvents.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleEvents.cleanUp();
    await apiServices.alertingV2.alertActionsEvents.cleanUp();
  });

  apiTest(
    'bulk snooze: processes valid items and persists one doc per series',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-series-snooze-rule';
      const groupHashOne = buildGroupHash('bulk-series-snooze-group-one');
      const groupHashTwo = buildGroupHash('bulk-series-snooze-group-two');

      const eventOne = buildAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: groupHashOne,
        alert: { id: 'bulk-series-snooze-episode-one', status: 'active' },
      });
      const eventTwo = buildAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: groupHashTwo,
        alert: { id: 'bulk-series-snooze-episode-two', status: 'active' },
      });
      await apiServices.alertingV2.ruleEvents.seed([eventOne, eventTwo]);

      const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
        headers: writerHeaders,
        body: {
          items: [
            { series_id: buildSeriesId(eventOne), snoozed_until: '2099-01-01T00:00:00Z' },
            { series_id: buildSeriesId(eventTwo), snoozed_until: '2099-06-01T00:00:00Z' },
          ],
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ affected_count: 2, errors: [] });

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['snooze'],
      });
      expect(actions).toHaveLength(2);

      const firstAction = actions.find((doc) => doc.group_hash === groupHashOne);
      const secondAction = actions.find((doc) => doc.group_hash === groupHashTwo);

      // Series actions target the series as a whole, so the persisted doc
      // carries `alert_id: null` even though an episode exists.
      expect(firstAction).toMatchObject({
        action_type: 'snooze',
        group_hash: groupHashOne,
        alert_id: null,
        rule_id: ruleId,
        expiry: '2099-01-01T00:00:00Z',
      });
      expect(secondAction).toMatchObject({
        action_type: 'snooze',
        group_hash: groupHashTwo,
        alert_id: null,
        rule_id: ruleId,
        expiry: '2099-06-01T00:00:00Z',
      });
    }
  );

  apiTest('bulk unsnooze: persists the unsnooze doc', async ({ apiClient, apiServices }) => {
    const ruleId = 'bulk-series-unsnooze-rule';
    const groupHash = buildGroupHash('bulk-series-unsnooze-group');

    const event = buildAlertEvent({
      rule: { id: ruleId, version: 1 },
      group_hash: groupHash,
      alert: { id: 'bulk-series-unsnooze-episode', status: 'active' },
    });
    await apiServices.alertingV2.ruleEvents.seed([event]);

    const snoozeResponse = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
      headers: writerHeaders,
      body: { items: [{ series_id: buildSeriesId(event) }] },
    });
    expect(snoozeResponse).toHaveStatusCode(200);

    const response = await apiClient.post(BULK_UNSNOOZE_SERIES_ACTION_URL, {
      headers: writerHeaders,
      body: { items: [{ series_id: buildSeriesId(event) }] },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ affected_count: 1, errors: [] });

    const actions = await apiServices.alertingV2.alertActionsEvents.find({
      ruleId,
      actionTypes: ['unsnooze'],
    });
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      action_type: 'unsnooze',
      group_hash: groupHash,
      alert_id: null,
      rule_id: ruleId,
    });
  });

  apiTest(
    'precondition: reports INVALID_ALERT_STATE_TRANSITION for a series that is not snoozed',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-series-unsnooze-no-op-rule';
      const snoozedEvent = buildAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: buildGroupHash('bulk-series-unsnooze-no-op-snoozed-group'),
        alert: { id: 'bulk-series-unsnooze-no-op-snoozed-episode', status: 'active' },
      });
      const notSnoozedEvent = buildAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: buildGroupHash('bulk-series-unsnooze-no-op-not-snoozed-group'),
        alert: { id: 'bulk-series-unsnooze-no-op-not-snoozed-episode', status: 'active' },
      });
      await apiServices.alertingV2.ruleEvents.seed([snoozedEvent, notSnoozedEvent]);

      const snoozeResponse = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
        headers: writerHeaders,
        body: { items: [{ series_id: buildSeriesId(snoozedEvent) }] },
      });
      expect(snoozeResponse).toHaveStatusCode(200);

      const response = await apiClient.post(BULK_UNSNOOZE_SERIES_ACTION_URL, {
        headers: writerHeaders,
        body: {
          items: [
            { series_id: buildSeriesId(snoozedEvent) },
            { series_id: buildSeriesId(notSnoozedEvent) },
          ],
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.affected_count).toBe(1);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].id).toBe(buildSeriesId(notSnoozedEvent));
      expect(response.body.errors[0].error.code).toBe('INVALID_ALERT_STATE_TRANSITION');

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['unsnooze'],
      });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({ group_hash: snoozedEvent.group_hash });
    }
  );

  apiTest(
    'partial success: reports ALERT_GROUP_NOT_FOUND when some series_ids are unknown',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-series-partial-rule';
      const knownGroup = buildGroupHash('bulk-series-partial-known-group');

      const knownEvent = buildAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: knownGroup,
        alert: { id: 'bulk-series-partial-known-episode', status: 'active' },
      });
      await apiServices.alertingV2.ruleEvents.seed([knownEvent]);

      const unknownSeriesId = buildSeriesId(
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: buildGroupHash('bulk-series-partial-unknown-group'),
        })
      );
      const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
        headers: writerHeaders,
        body: {
          items: [
            { series_id: buildSeriesId(knownEvent), snoozed_until: '2099-01-01T00:00:00Z' },
            { series_id: unknownSeriesId, snoozed_until: '2099-01-01T00:00:00Z' },
          ],
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.affected_count).toBe(1);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].id).toBe(unknownSeriesId);
      expect(response.body.errors[0].error.code).toBe('ALERT_GROUP_NOT_FOUND');

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['snooze'],
      });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        action_type: 'snooze',
        group_hash: knownGroup,
        alert_id: null,
      });
    }
  );

  apiTest(
    'partial success: reports a per-item error for every item when every series_id is unknown',
    async ({ apiClient, apiServices }) => {
      const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
        headers: writerHeaders,
        body: {
          items: [
            { series_id: buildUnknownSeriesId('bulk-series-allinvalid-1') },
            { series_id: buildUnknownSeriesId('bulk-series-allinvalid-2') },
          ],
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.affected_count).toBe(0);
      expect(response.body.errors).toHaveLength(2);
      expect(
        response.body.errors.map((e: { error: { code: string } }) => e.error.code)
      ).toStrictEqual(['ALERT_GROUP_NOT_FOUND', 'ALERT_GROUP_NOT_FOUND']);

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        actionTypes: ['snooze'],
      });
      expect(actions).toHaveLength(0);
    }
  );

  apiTest('schema: rejects a bare array body with 400', async ({ apiClient }) => {
    // The body must be an `{ items: [...] }` envelope, not a bare array.
    const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
      headers: writerHeaders,
      body: [{ series_id: ANY_SERIES_ID }],
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects empty items with 400', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
      headers: writerHeaders,
      body: { items: [] },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects more than 100 items with 400', async ({ apiClient }) => {
    const items = Array.from({ length: 101 }, (_v, i) => ({
      series_id: buildUnknownSeriesId(`bulk-series-too-many-${i}`),
    }));

    const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
      headers: writerHeaders,
      body: { items },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects an unknown envelope key with 400', async ({ apiClient }) => {
    // The envelope is strict: only `items` is accepted.
    const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
      headers: writerHeaders,
      body: { items: [{ series_id: ANY_SERIES_ID }], dry_run: true },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects an item missing series_id with 400', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
      headers: writerHeaders,
      body: { items: [{ snoozed_until: '2099-01-01T00:00:00Z' }] },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects an item carrying action_type with 400', async ({ apiClient }) => {
    // The verb is in the path now, so action_type is an unrecognized key
    // for the strict item schema.
    const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
      headers: writerHeaders,
      body: { items: [{ series_id: ANY_SERIES_ID, action_type: 'snooze' }] },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects an item carrying alert_id with 400', async ({ apiClient }) => {
    // Series items are identified by series_id only, so alert_id is an
    // unrecognized key for the strict item schema.
    const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
      headers: writerHeaders,
      body: { items: [{ series_id: ANY_SERIES_ID, alert_id: 'some-episode' }] },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'schema: rejects an item with an invalid per-action body with 400',
    async ({ apiClient }) => {
      // Snooze items accept an ISO `snoozed_until` date; sending a non-date
      // string should fail validation.
      const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
        headers: writerHeaders,
        body: { items: [{ series_id: ANY_SERIES_ID, snoozed_until: 'not-a-date' }] },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest('schema: rejects an item with empty series_id with 400', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
      headers: writerHeaders,
      body: { items: [{ series_id: '' }] },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'schema: rejects an item whose series_id has invalid characters or is too long with 400',
    async ({ apiClient }) => {
      for (const seriesId of ['not base64url!', 'not.base64url', 'a'.repeat(2049)]) {
        const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
          headers: writerHeaders,
          body: { items: [{ series_id: seriesId }] },
        });

        expect(response).toHaveStatusCode(400);
        expect(response.body.code).toBe('BAD_REQUEST');
      }
    }
  );

  apiTest(
    'schema: rejects an item whose series_id is malformed with INVALID_SERIES_ID',
    async ({ apiClient }) => {
      // A well-formed base64url value that does not decode to a series payload
      // passes the schema alphabet check but is rejected when decoded.
      const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
        headers: writerHeaders,
        body: { items: [{ series_id: 'bm90LWEtc2VyaWVz' }] },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('INVALID_SERIES_ID');
    }
  );

  apiTest(
    'schema: fails the whole request when one series_id is malformed and writes nothing',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-series-malformed-rule';
      const event = buildAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: buildGroupHash('bulk-series-malformed-group'),
        alert: { id: 'bulk-series-malformed-episode', status: 'active' },
      });
      await apiServices.alertingV2.ruleEvents.seed([event]);

      const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
        headers: writerHeaders,
        body: { items: [{ series_id: buildSeriesId(event) }, { series_id: 'bm90LWEtc2VyaWVz' }] },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('INVALID_SERIES_ID');

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['snooze'],
      });
      expect(actions).toHaveLength(0);
    }
  );

  apiTest('schema: rejects a repeated series_id with 400', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
      headers: writerHeaders,
      body: { items: [{ series_id: ANY_SERIES_ID }, { series_id: ANY_SERIES_ID }] },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'partial success: reports ALERT_GROUP_NOT_FOUND and writes nothing for a series_id minted for another space',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-series-other-space-rule';
      const groupHash = buildGroupHash('bulk-series-other-space-group');
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          alert: { id: 'bulk-series-other-space-episode', status: 'active' },
        }),
      ]);
      const otherSpaceSeriesId = buildSeriesId(
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          space_id: 'other-space',
        })
      );

      const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
        headers: writerHeaders,
        body: { items: [{ series_id: otherSpaceSeriesId }] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.affected_count).toBe(0);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].id).toBe(otherSpaceSeriesId);
      expect(response.body.errors[0].error.code).toBe('ALERT_GROUP_NOT_FOUND');

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['snooze'],
      });
      expect(actions).toHaveLength(0);
    }
  );

  apiTest(
    'schema: rejects an item with unknown body fields (strict mode) with 400',
    async ({ apiClient }) => {
      const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
        headers: writerHeaders,
        body: { items: [{ series_id: ANY_SERIES_ID, unknownField: 'x' }] },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest(
    'authorization: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ALERTS_READ_ROLE
      );

      const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { items: [{ series_id: ANY_SERIES_ID }] },
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);

      const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { items: [{ series_id: ANY_SERIES_ID }] },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
