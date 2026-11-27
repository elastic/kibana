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

apiTest.describe('Create unsnooze series action API', { tag: testData.API_ENGINE_TAG }, () => {
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
    'happy path: writes an unsnooze action and returns 204',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'unsnooze-happy-rule';
      const groupHash = buildGroupHash('unsnooze-happy-group');

      const event = buildAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: groupHash,
        alert: { id: 'unsnooze-happy-episode', status: 'active' },
      });
      await apiServices.alertingV2.ruleEvents.seed([event]);

      const snoozeResponse = await apiClient.post(getSnoozeSeriesActionUrl(buildSeriesId(event)), {
        headers: writerHeaders,
        body: {},
      });
      expect(snoozeResponse).toHaveStatusCode(204);

      const response = await apiClient.post(getUnsnoozeSeriesActionUrl(buildSeriesId(event)), {
        headers: writerHeaders,
        body: {},
      });

      expect(response).toHaveStatusCode(204);

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['unsnooze'],
      });
      expect(actions).toHaveLength(1);
      // Series actions target the series as a whole, so the persisted doc
      // carries `alert_id: null` even though an episode exists.
      expect(actions[0]).toMatchObject({
        action_type: 'unsnooze',
        group_hash: groupHash,
        alert_id: null,
        rule_id: ruleId,
        space_id: 'default',
      });
    }
  );

  apiTest(
    'precondition: unsnoozing a series that was never snoozed returns 409 and writes nothing',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'unsnooze-never-snoozed-rule';
      const groupHash = buildGroupHash('unsnooze-never-snoozed-group');

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          alert: { id: 'unsnooze-never-snoozed-episode', status: 'active' },
        }),
      ]);

      const response = await apiClient.post(
        getUnsnoozeSeriesActionUrl(seriesIdOf(ruleId, groupHash)),
        {
          headers: writerHeaders,
          body: {},
        }
      );

      expect(response).toHaveStatusCode(409);
      expect(response.body.code).toBe('INVALID_ALERT_STATE_TRANSITION');
      expect(response.body.details).toStrictEqual({
        group_hash: groupHash,
        action_type: 'unsnooze',
      });

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['unsnooze'],
      });
      expect(actions).toHaveLength(0);
    }
  );

  apiTest(
    'precondition: a repeated unsnooze returns 409 and writes no second action',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'unsnooze-repeat-rule';
      const groupHash = buildGroupHash('unsnooze-repeat-group');

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          alert: { id: 'unsnooze-repeat-episode', status: 'active' },
        }),
      ]);

      const snoozeResponse = await apiClient.post(
        getSnoozeSeriesActionUrl(seriesIdOf(ruleId, groupHash)),
        {
          headers: writerHeaders,
          body: {},
        }
      );
      expect(snoozeResponse).toHaveStatusCode(204);

      const firstResponse = await apiClient.post(
        getUnsnoozeSeriesActionUrl(seriesIdOf(ruleId, groupHash)),
        {
          headers: writerHeaders,
          body: {},
        }
      );
      expect(firstResponse).toHaveStatusCode(204);

      const secondResponse = await apiClient.post(
        getUnsnoozeSeriesActionUrl(seriesIdOf(ruleId, groupHash)),
        {
          headers: writerHeaders,
          body: {},
        }
      );
      expect(secondResponse).toHaveStatusCode(409);
      expect(secondResponse.body.code).toBe('INVALID_ALERT_STATE_TRANSITION');

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['unsnooze'],
      });
      expect(actions).toHaveLength(1);
    }
  );

  apiTest('schema: rejects unknown body fields (strict mode) with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getUnsnoozeSeriesActionUrl(ANY_SERIES_ID), {
      headers: writerHeaders,
      body: { extra: 'nope' },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects a series_id with invalid characters with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getUnsnoozeSeriesActionUrl('not base64url!'), {
      headers: writerHeaders,
      body: {},
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'schema: rejects a series_id that is not a series payload with INVALID_SERIES_ID',
    async ({ apiClient }) => {
      const response = await apiClient.post(getUnsnoozeSeriesActionUrl('bm90LWEtc2VyaWVz'), {
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
        rule: { id: 'unsnooze-unknown-rule', version: 1 },
        group_hash: buildGroupHash('unknown-group'),
      })
    );
    const response = await apiClient.post(getUnsnoozeSeriesActionUrl(seriesId), {
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
      const ruleId = 'unsnooze-other-space-rule';
      const groupHash = buildGroupHash('unsnooze-other-space-group');
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          alert: { id: 'unsnooze-other-space-episode', status: 'active' },
        }),
      ]);
      const otherSpaceSeriesId = buildSeriesId(
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          space_id: 'other-space',
        })
      );

      const response = await apiClient.post(getUnsnoozeSeriesActionUrl(otherSpaceSeriesId), {
        headers: writerHeaders,
        body: {},
      });

      expect(response).toHaveStatusCode(404);
      expect(response.body.code).toBe('ALERT_EVENT_NOT_FOUND');

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['unsnooze'],
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

      const response = await apiClient.post(getUnsnoozeSeriesActionUrl(ANY_SERIES_ID), {
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

      const response = await apiClient.post(getUnsnoozeSeriesActionUrl(ANY_SERIES_ID), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: {},
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
