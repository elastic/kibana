/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * We exclude `@kbn/eslint/scout_require_api_client_in_api_test` for this spec
 * because we are not testing an HTTP endpoint — we drive the `.alert-actions`
 * cleanup background task and observe the data stream via `apiServices`. The
 * same exclusion is used by `telemetry.spec.ts` for the equivalent reason.
 */

/* eslint-disable @kbn/eslint/scout_require_api_client_in_api_test */

import { expect } from '@kbn/scout/api';
import type { AlertAction } from '../../../../../server/resources/datastreams/alert_actions';
import { apiTest, buildGroupHash } from '../fixtures';

const RULE_ID = 'alert-actions-cleanup-rule';
const DAY_MS = 24 * 60 * 60 * 1000;

// The server config set enables the task with the default 90d retention.
const EXPIRED_TIMESTAMP = new Date(Date.now() - 100 * DAY_MS).toISOString();
const RECENT_TIMESTAMP = new Date(Date.now() - DAY_MS).toISOString();

const buildAction = (actionType: AlertAction['action_type'], timestamp: string): AlertAction => ({
  '@timestamp': timestamp,
  last_series_event_timestamp: timestamp,
  group_hash: buildGroupHash(`${actionType}-${timestamp}`),
  actor: { type: 'internal' },
  action_type: actionType,
  rule_id: RULE_ID,
  space_id: 'default',
});

apiTest.describe('Alert actions cleanup task', { tag: '@local-stateful-classic' }, () => {
  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.alertActionsEvents.cleanUp({ ruleId: RULE_ID });
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.alertActionsEvents.cleanUp({ ruleId: RULE_ID });
  });

  apiTest('is scheduled to run daily', async ({ apiServices }) => {
    const task = await apiServices.alertingV2.alertActionsCleanup.getTask();

    expect(task?.schedule).toStrictEqual({ interval: '1d' });
  });

  apiTest(
    'deletes expired dispatcher docs and keeps every other action',
    async ({ apiServices }) => {
      await apiServices.alertingV2.alertActionsEvents.seed([
        buildAction('fire', EXPIRED_TIMESTAMP),
        buildAction('suppress', EXPIRED_TIMESTAMP),
        buildAction('unmatched', EXPIRED_TIMESTAMP),
        buildAction('notified', EXPIRED_TIMESTAMP),
        buildAction('ack', EXPIRED_TIMESTAMP),
        buildAction('snooze', EXPIRED_TIMESTAMP),
        buildAction('tag', EXPIRED_TIMESTAMP),
        buildAction('fire', RECENT_TIMESTAMP),
        buildAction('suppress', RECENT_TIMESTAMP),
        buildAction('unmatched', RECENT_TIMESTAMP),
      ]);

      await apiServices.alertingV2.alertActionsCleanup.runAndWait();

      const remaining = await apiServices.alertingV2.alertActionsEvents.find({ ruleId: RULE_ID });
      const remainingActions = remaining
        .map(
          ({ action_type: actionType, '@timestamp': timestamp }) =>
            `${timestamp === EXPIRED_TIMESTAMP ? 'expired' : 'recent'}-${actionType}`
        )
        .sort();

      expect(remainingActions).toStrictEqual([
        'expired-ack',
        'expired-notified',
        'expired-snooze',
        'expired-tag',
        'recent-fire',
        'recent-suppress',
        'recent-unmatched',
      ]);
    }
  );
});
