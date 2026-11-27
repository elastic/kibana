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
  getSnoozeSeriesActionUrl,
  getUnsnoozeSeriesActionUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

const ANY_SERIES_ID = buildSeriesId(
  buildAlertEvent({
    rule: { id: 'any-rule', version: 1 },
    group_hash: buildGroupHash('any-group'),
  })
);

/**
 * Series id of the series `buildAlertEvent` produces for `ruleId` and `groupHash`, for the
 * specs that seed an event and then address its series.
 */
const seriesIdOf = (ruleId: string, groupHash: string): string =>
  buildSeriesId(buildAlertEvent({ rule: { id: ruleId, version: 1 }, group_hash: groupHash }));

apiTest.describe('Create snooze series action API', { tag: testData.API_ENGINE_TAG }, () => {
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
    'snooze: writes a snooze action with snoozed_until and returns 204',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'snooze-happy-rule';
      const groupHash = buildGroupHash('snooze-happy-group');
      const snoozedUntil = '2099-01-01T00:00:00.000Z';
      const event = buildAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: groupHash,
        alert: { id: 'snooze-happy-episode', status: 'active' },
      });
      await apiServices.alertingV2.ruleEvents.seed([event]);
      const response = await apiClient.post(getSnoozeSeriesActionUrl(buildSeriesId(event)), {
        headers: writerHeaders,
        body: { snoozed_until: snoozedUntil },
      });
      expect(response).toHaveStatusCode(204);
      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['snooze'],
      });
      expect(actions).toHaveLength(1);
      // Series actions target the series as a whole, so the persisted doc
      // carries `alert_id: null` even though an episode exists. The
      // `.alert-actions` mapping keeps the legacy `expiry` field name.
      expect(actions[0]).toMatchObject({
        action_type: 'snooze',
        group_hash: groupHash,
        alert_id: null,
        rule_id: ruleId,
        space_id: 'default',
        expiry: snoozedUntil,
      });
    }
  );

  apiTest(
    'snooze: writes a snooze action without snoozed_until and returns 204',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'snooze-no-expiry-rule';
      const groupHash = buildGroupHash('snooze-no-expiry-group');
      const event = buildAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: groupHash,
        alert: { id: 'snooze-no-expiry-episode', status: 'active' },
      });
      await apiServices.alertingV2.ruleEvents.seed([event]);
      const response = await apiClient.post(getSnoozeSeriesActionUrl(buildSeriesId(event)), {
        headers: writerHeaders,
        body: {},
      });
      expect(response).toHaveStatusCode(204);
      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['snooze'],
      });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        action_type: 'snooze',
        group_hash: groupHash,
        alert_id: null,
        rule_id: ruleId,
      });
      expect(actions[0].expiry).toBeUndefined();
    }
  );

  apiTest(
    'precondition: repeating the expiry in effect returns 409 and writes no second action',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'snooze-repeat-rule';
      const groupHash = buildGroupHash('snooze-repeat-group');
      const snoozedUntil = '2099-01-01T00:00:00.000Z';
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          alert: { id: 'snooze-repeat-episode', status: 'active' },
        }),
      ]);

      const firstResponse = await apiClient.post(
        getSnoozeSeriesActionUrl(seriesIdOf(ruleId, groupHash)),
        {
          headers: writerHeaders,
          body: { snoozed_until: snoozedUntil },
        }
      );
      expect(firstResponse).toHaveStatusCode(204);

      const response = await apiClient.post(
        getSnoozeSeriesActionUrl(seriesIdOf(ruleId, groupHash)),
        {
          headers: writerHeaders,
          body: { snoozed_until: snoozedUntil },
        }
      );
      expect(response).toHaveStatusCode(409);
      expect(response.body.code).toBe('ALERT_ACTION_NO_OP');
      expect(response.body.details).toStrictEqual({ group_hash: groupHash, action_type: 'snooze' });

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['snooze'],
      });
      expect(actions).toHaveLength(1);
    }
  );

  apiTest(
    'precondition: repeating an indefinite snooze returns 409',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'snooze-repeat-indefinite-rule';
      const groupHash = buildGroupHash('snooze-repeat-indefinite-group');
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          alert: { id: 'snooze-repeat-indefinite-episode', status: 'active' },
        }),
      ]);

      const firstResponse = await apiClient.post(
        getSnoozeSeriesActionUrl(seriesIdOf(ruleId, groupHash)),
        {
          headers: writerHeaders,
          body: {},
        }
      );
      expect(firstResponse).toHaveStatusCode(204);

      const response = await apiClient.post(
        getSnoozeSeriesActionUrl(seriesIdOf(ruleId, groupHash)),
        {
          headers: writerHeaders,
          body: {},
        }
      );
      expect(response).toHaveStatusCode(409);
      expect(response.body.code).toBe('ALERT_ACTION_NO_OP');
    }
  );

  apiTest(
    'precondition: an indefinite snooze after a timed one is judged on its own, not the earlier expiry',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'snooze-timed-then-indefinite-rule';
      const groupHash = buildGroupHash('snooze-timed-then-indefinite-group');
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          alert: { id: 'snooze-timed-then-indefinite-episode', status: 'active' },
        }),
      ]);

      const timedResponse = await apiClient.post(
        getSnoozeSeriesActionUrl(seriesIdOf(ruleId, groupHash)),
        {
          headers: writerHeaders,
          body: { snoozed_until: '2099-01-01T00:00:00.000Z' },
        }
      );
      expect(timedResponse).toHaveStatusCode(204);

      // Going from a timed to an indefinite snooze changes the series.
      const indefiniteResponse = await apiClient.post(
        getSnoozeSeriesActionUrl(seriesIdOf(ruleId, groupHash)),
        {
          headers: writerHeaders,
          body: {},
        }
      );
      expect(indefiniteResponse).toHaveStatusCode(204);

      // The indefinite snooze is now in effect, so repeating it changes nothing.
      const repeatResponse = await apiClient.post(
        getSnoozeSeriesActionUrl(seriesIdOf(ruleId, groupHash)),
        {
          headers: writerHeaders,
          body: {},
        }
      );
      expect(repeatResponse).toHaveStatusCode(409);
      expect(repeatResponse.body.code).toBe('ALERT_ACTION_NO_OP');

      // And the series can still be unsnoozed.
      const unsnoozeResponse = await apiClient.post(
        getUnsnoozeSeriesActionUrl(seriesIdOf(ruleId, groupHash)),
        {
          headers: writerHeaders,
          body: {},
        }
      );
      expect(unsnoozeResponse).toHaveStatusCode(204);

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['snooze', 'unsnooze'],
      });
      expect(actions).toHaveLength(3);
    }
  );

  apiTest(
    'precondition: changing the expiry in effect returns 204',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'snooze-extend-rule';
      const groupHash = buildGroupHash('snooze-extend-group');
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          alert: { id: 'snooze-extend-episode', status: 'active' },
        }),
      ]);

      for (const snoozedUntil of ['2099-01-01T00:00:00.000Z', '2099-06-01T00:00:00.000Z']) {
        const response = await apiClient.post(
          getSnoozeSeriesActionUrl(seriesIdOf(ruleId, groupHash)),
          {
            headers: writerHeaders,
            body: { snoozed_until: snoozedUntil },
          }
        );
        expect(response).toHaveStatusCode(204);
      }

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['snooze'],
      });
      expect(actions).toHaveLength(2);
    }
  );

  apiTest('schema: rejects snoozed_until that is not ISO 8601 with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getSnoozeSeriesActionUrl(ANY_SERIES_ID), {
      headers: writerHeaders,
      body: { snoozed_until: 'not-a-date' },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'schema: rejects snoozed_until without the time component with 400',
    async ({ apiClient }) => {
      // `z.iso.datetime()` requires a full ISO 8601 datetime; a date-only value
      // like `2099-01-01` should be rejected.
      const response = await apiClient.post(getSnoozeSeriesActionUrl(ANY_SERIES_ID), {
        headers: writerHeaders,
        body: { snoozed_until: '2099-01-01' },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest('schema: rejects unknown body fields (strict mode) with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getSnoozeSeriesActionUrl(ANY_SERIES_ID), {
      headers: writerHeaders,
      body: { extra: 'nope' },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  const invalidAlphabetSeriesIds = [
    ['a space and punctuation', 'not base64url!'],
    ['a dot', 'not.base64url'],
    ['a padding character', 'bm90LWEtc2VyaWVz='],
    ['more than 2048 characters', 'a'.repeat(2049)],
  ] as const;

  for (const [label, seriesId] of invalidAlphabetSeriesIds) {
    apiTest(`schema: rejects a series_id with ${label} with 400`, async ({ apiClient }) => {
      const response = await apiClient.post(getSnoozeSeriesActionUrl(seriesId), {
        headers: writerHeaders,
        body: {},
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    });
  }

  apiTest(
    'schema: rejects a series_id that is a base64url value that is not a series payload with INVALID_SERIES_ID',
    async ({ apiClient }) => {
      const response = await apiClient.post(getSnoozeSeriesActionUrl('bm90LWEtc2VyaWVz'), {
        headers: writerHeaders,
        body: {},
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('INVALID_SERIES_ID');
    }
  );

  apiTest('returns 404 when series_id matches no events', async ({ apiClient }) => {
    const seriesId = buildSeriesId(
      buildAlertEvent({
        rule: { id: 'snooze-unknown-rule', version: 1 },
        group_hash: buildGroupHash('unknown-group'),
      })
    );
    const response = await apiClient.post(getSnoozeSeriesActionUrl(seriesId), {
      headers: writerHeaders,
      body: {},
    });
    expect(response).toHaveStatusCode(404);
    expect(response.body.code).toBe('ALERT_EVENT_NOT_FOUND');
    expect(response.body.details).toMatchObject({ series_id: seriesId });
  });

  apiTest(
    'returns 404 and writes nothing when series_id was minted for another space',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'snooze-other-space-rule';
      const groupHash = buildGroupHash('snooze-other-space-group');
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          alert: { id: 'snooze-other-space-episode', status: 'active' },
        }),
      ]);
      const otherSpaceSeriesId = buildSeriesId(
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          space_id: 'other-space',
        })
      );

      const response = await apiClient.post(getSnoozeSeriesActionUrl(otherSpaceSeriesId), {
        headers: writerHeaders,
        body: {},
      });
      expect(response).toHaveStatusCode(404);
      expect(response.body.code).toBe('ALERT_EVENT_NOT_FOUND');

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['snooze'],
      });
      expect(actions).toHaveLength(0);
    }
  );

  apiTest(
    'authorization: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ALERTS_READ_ROLE
      );
      const response = await apiClient.post(getSnoozeSeriesActionUrl(ANY_SERIES_ID), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: {},
      });
      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.post(getSnoozeSeriesActionUrl(ANY_SERIES_ID), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: {},
      });
      expect(response).toHaveStatusCode(403);
    }
  );
});
