/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * We exclude `@kbn/eslint/scout_require_api_client_in_api_test` for this spec
 * because we are not testing an HTTP endpoint — we drive the alerting_v2
 * dispatcher background task by seeding alert events into the data stream and
 * observing the alert-actions data stream. Side-effect assertions go through
 * `apiServices`, which is the right tool here.
 */

/* eslint-disable @kbn/eslint/scout_require_api_client_in_api_test */

import { setTimeout as wait } from 'timers/promises';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type {
  AlertEvent,
  AlertEventStatus,
  AlertEpisodeStatus,
} from '../../../../server/resources/datastreams/alert_events';
import type { AlertAction } from '../../../../server/resources/datastreams/alert_actions';
import type { AlertingApiServicesFixture } from '../fixtures';
import { apiTest, buildCreateRuleData, testData } from '../fixtures';

const { POLL_INTERVAL_MS, POLL_TIMEOUT_MS, WAIT_TIME_MS } = testData;

const ACTION_POLICY_ID = 'np-1';
const ACTION_POLICY_MATCHER_ID = 'np-matcher';
const ACTION_POLICY_GROUPBY_ID = 'np-groupby';

/**
 * Test rule identifiers. Each rule is created via the public API in `beforeAll`
 * and immediately bulk-disabled so the rule executor task does not write extra
 * events into `.rule-events` while these tests are seeding synthetic events.
 *
 * Disabled rules are still returned by the dispatcher's `findByIds` call, so
 * they remain available for the dispatcher pipeline.
 */
const TEST_RULE_IDS = [
  'rule-1',
  'rule-001',
  'rule-002',
  'rule-003',
  'rule-004',
  'rule-005',
  'rule-matcher',
  'rule-groupby',
] as const;

/** Returns an ISO timestamp `secondsAgo` seconds in the past, relative to `base`. */
const relativeTime = (secondsAgo: number, base: number = Date.now()): string =>
  new Date(base - secondsAgo * 1000).toISOString();

interface BuildAlertEventInput {
  ruleId: string;
  groupHash: string;
  episodeId: string;
  episodeStatus: AlertEpisodeStatus;
  status: AlertEventStatus;
  data?: AlertEvent['data'];
  timestamp: string;
}

const buildAlertEvent = ({
  ruleId,
  groupHash,
  episodeId,
  episodeStatus,
  status,
  data = {},
  timestamp,
}: BuildAlertEventInput): AlertEvent => ({
  '@timestamp': timestamp,
  type: 'alert',
  rule: { id: ruleId, version: 1 },
  group_hash: groupHash,
  episode: { id: episodeId, status: episodeStatus },
  data,
  status,
  source: 'internal',
  space_id: 'default',
});

interface BuildAlertActionInput {
  ruleId: string;
  groupHash: string;
  episodeId?: string;
  actionType: AlertAction['action_type'];
  lastSeriesEventTimestamp: string;
  timestamp: string;
  expiry?: string;
}

const buildAlertAction = ({
  ruleId,
  groupHash,
  episodeId,
  actionType,
  lastSeriesEventTimestamp,
  timestamp,
  expiry,
}: BuildAlertActionInput): AlertAction => ({
  '@timestamp': timestamp,
  actor: 'elastic',
  action_type: actionType,
  last_series_event_timestamp: lastSeriesEventTimestamp,
  rule_id: ruleId,
  group_hash: groupHash,
  ...(episodeId ? { episode_id: episodeId } : {}),
  ...(expiry ? { expiry } : {}),
  space_id: 'default',
});

/**
 * Polls `apiServices.alertingV2.alertActions.find(...)` until the count matches
 * `expected`, then asserts no further actions arrive within an extra grace
 * period. Use this when a test asserts an exact number of side-effect actions
 * (the next dispatcher tick must not produce extras).
 */
const expectStableCount = async (
  apiServices: AlertingApiServicesFixture,
  expected: number,
  filter: { ruleId?: string; actionType?: AlertAction['action_type'] }
): Promise<AlertAction[]> => {
  await apiServices.alertingV2.alertActions.waitForAtLeast(expected, filter);

  // Poll for ~1 dispatcher tick + margin so a regression that produces extra
  // actions has time to surface before we lock in the count.
  await wait(WAIT_TIME_MS);

  const actions = await apiServices.alertingV2.alertActions.find(filter);
  expect(actions).toHaveLength(expected);
  return actions;
};

apiTest.describe('Dispatcher', { tag: tags.stateful.classic }, () => {
  apiTest.beforeAll(async ({ apiServices }) => {
    // Drop any leftovers from previous runs before seeding fresh fixtures.
    await apiServices.alertingV2.actionPolicies.cleanUp();
    await apiServices.alertingV2.rules.cleanUp();
    await apiServices.alertingV2.ruleEvents.cleanUp();
    await apiServices.alertingV2.alertActions.cleanUp();

    // Test rules: created via the public API so their auth/api-key wiring
    // matches production, then immediately disabled so the executor task
    // does not pollute `.rule-events` with breach events the dispatcher
    // would race against. The dispatcher's `findByIds` returns disabled
    // rules, so suppression behavior is unaffected.
    for (const ruleId of TEST_RULE_IDS) {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: `Dispatcher test ${ruleId}` },
          schedule: { every: '1d' },
          // A `WHERE _id == "__never_matches__"` query against an existing
          // index is the cheapest no-op: it parses, runs successfully, and
          // returns zero rows even if the executor task fires before the
          // bulkDisable below lands.
          evaluation: {
            query: { base: 'FROM .alert-actions | WHERE _id == "__never_matches__"' },
          },
          recovery_policy: { type: 'no_breach' },
          state_transition: { pending_count: 0, recovering_count: 0 },
        }),
        { id: ruleId }
      );
    }

    await apiServices.alertingV2.rules.bulkDisable({ ids: [...TEST_RULE_IDS] });

    // Action policies: seed with the same logical IDs the dispatcher Jest
    // tests used so reasoning ("notified by policy np-1", etc.) carries over.
    await apiServices.alertingV2.actionPolicies.create(
      {
        name: 'Test Policy',
        description: 'Default test action policy',
        destinations: [{ type: 'workflow', id: 'test-workflow' }],
      },
      { id: ACTION_POLICY_ID }
    );

    await apiServices.alertingV2.actionPolicies.create(
      {
        name: 'Matcher Policy',
        description: 'Only matches critical severity',
        destinations: [{ type: 'workflow', id: 'test-workflow' }],
        matcher: 'data.severity: "critical"',
      },
      { id: ACTION_POLICY_MATCHER_ID }
    );
    await apiServices.alertingV2.actionPolicies.disable(ACTION_POLICY_MATCHER_ID);

    await apiServices.alertingV2.actionPolicies.create(
      {
        name: 'GroupBy Policy',
        description: 'Groups by host.name',
        destinations: [{ type: 'workflow', id: 'test-workflow' }],
        groupBy: ['data.host.name'],
        groupingMode: 'per_field',
      },
      { id: ACTION_POLICY_GROUPBY_ID }
    );
    await apiServices.alertingV2.actionPolicies.disable(ACTION_POLICY_GROUPBY_ID);
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    // Fresh data streams between tests so `last_fired` filters and notified
    // throttle bookkeeping start from a clean slate.
    await apiServices.alertingV2.alertActions.cleanUp();
    await apiServices.alertingV2.ruleEvents.cleanUp();

    // Reset action policies to the default (np-1 enabled, no throttle; the
    // matcher and groupBy policies disabled). Each test toggles only what
    // it needs.
    await apiServices.alertingV2.actionPolicies.patch(ACTION_POLICY_ID, { throttle: null });
    await apiServices.alertingV2.actionPolicies.enable(ACTION_POLICY_ID);
    await apiServices.alertingV2.actionPolicies.disable(ACTION_POLICY_MATCHER_ID);
    await apiServices.alertingV2.actionPolicies.patch(ACTION_POLICY_GROUPBY_ID, { throttle: null });
    await apiServices.alertingV2.actionPolicies.disable(ACTION_POLICY_GROUPBY_ID);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.alertActions.cleanUp();
    await apiServices.alertingV2.ruleEvents.cleanUp();
    await apiServices.alertingV2.rules.cleanUp();
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  apiTest(
    'does not dispatch any episodes when there are no alert events',
    async ({ apiServices }) => {
      // Wait long enough for at least one dispatcher tick (5s schedule + jitter).
      await wait(WAIT_TIME_MS);

      const actions = await apiServices.alertingV2.alertActions.find();
      expect(actions).toHaveLength(0);
    }
  );

  apiTest(
    'dispatches all unique episodes when alert events have no prior fire actions',
    async ({ apiServices }) => {
      // 3 episodes for rule-1, mirroring ALERT_EVENTS_TEST_DATA from the Jest test:
      //  - episode-3 active                           (latest @ -10s)
      //  - episode-2 active -> inactive (collapsed)   (latest @ -45s)
      //  - episode-1 active -> inactive (collapsed)   (latest @ -90s)
      const ts = (sec: number) => relativeTime(sec);
      const events: AlertEvent[] = [
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-3',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: ts(10),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-2',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: ts(45),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-2',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: ts(50),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-1',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: ts(85),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-1',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: ts(90),
        }),
      ];

      await apiServices.alertingV2.ruleEvents.seed(events);

      const fireActions = await expectStableCount(apiServices, 3, {
        ruleId: 'rule-1',
        actionType: 'fire',
      });

      for (const event of fireActions) {
        expect(event).toMatchObject({
          group_hash: 'rule-1-series-1',
          rule_id: 'rule-1',
          actor: 'system',
          action_type: 'fire',
          source: 'internal',
        });
      }

      // Each fire's `last_series_event_timestamp` must equal the latest
      // alert event timestamp seen for the corresponding episode.
      const fireEpisodeTimestamps = fireActions
        .map((action) => action.last_series_event_timestamp)
        .sort();
      expect(fireEpisodeTimestamps).toStrictEqual([ts(10), ts(45), ts(90)].sort());

      const notifiedActions = await apiServices.alertingV2.alertActions.find({
        ruleId: 'rule-1',
        actionType: 'notified',
      });
      expect(notifiedActions).toHaveLength(3);
    }
  );

  apiTest(
    'persists notified actions for dispatched action groups when the action policy has a throttle interval',
    async ({ apiServices }) => {
      await apiServices.alertingV2.actionPolicies.patch(ACTION_POLICY_ID, {
        throttle: { strategy: 'per_status_interval', interval: '1h' },
      });

      const ts = (sec: number) => relativeTime(sec);
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-3',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: ts(10),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-2',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: ts(45),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-1',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: ts(85),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-1',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: ts(90),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-2',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: ts(50),
        }),
      ]);

      const notifiedActions = await expectStableCount(apiServices, 3, {
        ruleId: 'rule-1',
        actionType: 'notified',
      });

      for (const action of notifiedActions) {
        expect(action).toMatchObject({
          actor: 'system',
          action_type: 'notified',
          rule_id: 'rule-1',
          source: 'internal',
          reason: `notified by policy ${ACTION_POLICY_ID}`,
        });
        expect(typeof action.action_group_id).toBe('string');
        expect(action.group_hash).toBe('rule-1-series-1');
      }
    }
  );

  apiTest(
    'only dispatches the new events when some episodes already have fires',
    async ({ apiServices }) => {
      const ts = (sec: number) => relativeTime(sec);
      const initialEvents: AlertEvent[] = [
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-3',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: ts(60),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-2',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: ts(80),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-1',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: ts(120),
        }),
      ];

      await apiServices.alertingV2.ruleEvents.seed(initialEvents);
      await apiServices.alertingV2.alertActions.waitForAtLeast(3, {
        ruleId: 'rule-1',
        actionType: 'fire',
      });

      // Capture the latest fire timestamp so we can scope the post-seed
      // assertion to events strictly newer than the initial dispatch run.
      const initialFires = await apiServices.alertingV2.alertActions.find({
        ruleId: 'rule-1',
        actionType: 'fire',
      });
      const initialMaxFireTs = Math.max(
        ...initialFires.map((action) => Date.parse(action.last_series_event_timestamp))
      );

      // New event with @timestamp strictly greater than every previous fire's
      // `last_series_event_timestamp`. This is the only way the dispatcher's
      // `last_fired < @timestamp` filter lets the same episode through again.
      const newEventTimestamp = new Date(initialMaxFireTs + 5_000).toISOString();
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-3',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: newEventTimestamp,
        }),
      ]);

      await expect
        .poll(
          async () => {
            const actions = await apiServices.alertingV2.alertActions.find({
              ruleId: 'rule-1',
              actionType: 'fire',
            });
            return actions.filter(
              (action) =>
                Date.parse(action.last_series_event_timestamp) === Date.parse(newEventTimestamp)
            ).length;
          },
          { timeout: POLL_TIMEOUT_MS, intervals: [POLL_INTERVAL_MS] }
        )
        .toBe(1);
    }
  );

  apiTest(
    'dispatches fire actions for non-suppressed episodes and suppress actions for suppressed ones when alert episodes have user actions',
    async ({ apiServices }) => {
      const baseTime = Date.now();
      // Each rule has events spread across the last ~3 minutes, with each
      // event timestamp at most ~3min in the past. The dispatcher's 10min
      // lookback comfortably covers these.
      const eventTs = (sec: number) => relativeTime(sec, baseTime);
      const actionTs = (sec: number) => relativeTime(sec, baseTime);

      const buildSeriesEvents = (
        ruleId: string,
        groupHash: string,
        episodeId: string,
        startSecondsAgo: number,
        episodeStatus: AlertEpisodeStatus = 'active',
        status: AlertEventStatus = 'breached'
      ): AlertEvent[] =>
        [0, 5, 10, 15].map((offset) =>
          buildAlertEvent({
            ruleId,
            groupHash,
            episodeId,
            episodeStatus,
            status,
            timestamp: eventTs(startSecondsAgo - offset),
          })
        );

      const events: AlertEvent[] = [
        // rule-001: single series, 4 events
        ...buildSeriesEvents('rule-001', 'rule-001-series-1', 'rule-001-series-1-episode-1', 180),
        // rule-002: single series, 4 events
        ...buildSeriesEvents('rule-002', 'rule-002-series-1', 'rule-002-series-1-episode-1', 180),
        // rule-003 series-1: 4 events, all active
        ...buildSeriesEvents('rule-003', 'rule-003-series-1', 'rule-003-series-1-episode-1', 180),
        // rule-003 series-2: ep1 active then recovered, ep2 active twice
        buildAlertEvent({
          ruleId: 'rule-003',
          groupHash: 'rule-003-series-2',
          episodeId: 'rule-003-series-2-episode-1',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: eventTs(180),
        }),
        buildAlertEvent({
          ruleId: 'rule-003',
          groupHash: 'rule-003-series-2',
          episodeId: 'rule-003-series-2-episode-1',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: eventTs(175),
        }),
        buildAlertEvent({
          ruleId: 'rule-003',
          groupHash: 'rule-003-series-2',
          episodeId: 'rule-003-series-2-episode-2',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: eventTs(170),
        }),
        buildAlertEvent({
          ruleId: 'rule-003',
          groupHash: 'rule-003-series-2',
          episodeId: 'rule-003-series-2-episode-2',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: eventTs(165),
        }),
        // rule-004: two series, 4 events each
        ...buildSeriesEvents('rule-004', 'rule-004-series-1', 'rule-004-series-1-episode-1', 180),
        ...buildSeriesEvents('rule-004', 'rule-004-series-2', 'rule-004-series-2-episode-1', 180),
        // rule-005: two series, 4 events each
        ...buildSeriesEvents('rule-005', 'rule-005-series-1', 'rule-005-series-1-episode-1', 180),
        ...buildSeriesEvents('rule-005', 'rule-005-series-2', 'rule-005-series-2-episode-1', 180),
      ];

      await apiServices.alertingV2.ruleEvents.seed(events);

      // User actions:
      //  - rule-001 ack then unack → suppression cancelled → fire
      //  - rule-002 ack only → suppress
      //  - rule-004 series-1+2 snoozed → suppress (no episode_id, expires far in future)
      //  - rule-005 series-1 deactivated → suppress; series-2 unaffected → fire
      const futureExpiry = new Date(baseTime + 24 * 60 * 60 * 1000).toISOString();
      const userActions: AlertAction[] = [
        buildAlertAction({
          ruleId: 'rule-001',
          groupHash: 'rule-001-series-1',
          episodeId: 'rule-001-series-1-episode-1',
          actionType: 'ack',
          lastSeriesEventTimestamp: eventTs(180),
          timestamp: actionTs(178),
        }),
        buildAlertAction({
          ruleId: 'rule-001',
          groupHash: 'rule-001-series-1',
          episodeId: 'rule-001-series-1-episode-1',
          actionType: 'unack',
          lastSeriesEventTimestamp: eventTs(175),
          timestamp: actionTs(173),
        }),
        buildAlertAction({
          ruleId: 'rule-002',
          groupHash: 'rule-002-series-1',
          episodeId: 'rule-002-series-1-episode-1',
          actionType: 'ack',
          lastSeriesEventTimestamp: eventTs(180),
          timestamp: actionTs(178),
        }),
        buildAlertAction({
          ruleId: 'rule-004',
          groupHash: 'rule-004-series-1',
          actionType: 'snooze',
          lastSeriesEventTimestamp: eventTs(180),
          timestamp: actionTs(178),
          expiry: futureExpiry,
        }),
        buildAlertAction({
          ruleId: 'rule-004',
          groupHash: 'rule-004-series-2',
          actionType: 'snooze',
          lastSeriesEventTimestamp: eventTs(180),
          timestamp: actionTs(178),
          expiry: futureExpiry,
        }),
        buildAlertAction({
          ruleId: 'rule-005',
          groupHash: 'rule-005-series-1',
          episodeId: 'rule-005-series-1-episode-1',
          actionType: 'deactivate',
          lastSeriesEventTimestamp: eventTs(175),
          timestamp: actionTs(173),
        }),
      ];
      await apiServices.alertingV2.alertActions.seed(userActions);

      // Wait until the dispatcher has produced the full set:
      //  - rule-001:                fire     (ack/unack net = no suppress)
      //  - rule-002:                suppress (ack only)
      //  - rule-003 series-1:       fire     (1 episode, latest active)
      //  - rule-003 series-2 ep1:   fire     (collapsed inactive)
      //  - rule-003 series-2 ep2:   fire     (latest active)
      //  - rule-004 series-1:       suppress (snoozed)
      //  - rule-004 series-2:       suppress (snoozed)
      //  - rule-005 series-1:       suppress (deactivated)
      //  - rule-005 series-2:       fire
      // Total: 5 fire + 4 suppress = 9.
      await apiServices.alertingV2.alertActions.waitForAtLeast(9, {
        actionTypes: ['fire', 'suppress'],
      });

      // Filter out the user actions seeded above (ack/unack/snooze/deactivate)
      // so the assertions only see dispatcher-generated fire/suppress actions.
      const dispatched = await apiServices.alertingV2.alertActions.find({
        actionTypes: ['fire', 'suppress'],
      });

      const fireActions = dispatched.filter((action) => action.action_type === 'fire');
      const suppressActions = dispatched.filter((action) => action.action_type === 'suppress');
      expect(fireActions).toHaveLength(5);
      expect(suppressActions).toHaveLength(4);

      // rule-001: fire (ack/unack cancels suppression)
      expect(dispatched).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'rule-001',
            group_hash: 'rule-001-series-1',
            action_type: 'fire',
            actor: 'system',
            source: 'internal',
          }),
        ])
      );

      // rule-002: suppress (ack with no unack)
      expect(dispatched).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'rule-002',
            group_hash: 'rule-002-series-1',
            action_type: 'suppress',
          }),
        ])
      );

      // rule-003: 3 fires across 2 series (series-1 active, series-2 ep1 inactive, ep2 active)
      const rule003Fires = fireActions.filter((action) => action.rule_id === 'rule-003');
      expect(rule003Fires).toHaveLength(3);

      // rule-004: both series suppress (snoozed with null episode_id)
      expect(dispatched).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'rule-004',
            group_hash: 'rule-004-series-1',
            action_type: 'suppress',
          }),
          expect.objectContaining({
            rule_id: 'rule-004',
            group_hash: 'rule-004-series-2',
            action_type: 'suppress',
          }),
        ])
      );

      // rule-005: series-1 suppress (deactivated), series-2 fire (no actions)
      expect(dispatched).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'rule-005',
            group_hash: 'rule-005-series-1',
            action_type: 'suppress',
          }),
          expect.objectContaining({
            rule_id: 'rule-005',
            group_hash: 'rule-005-series-2',
            action_type: 'fire',
          }),
        ])
      );
    }
  );

  apiTest(
    'only dispatches episodes matching the KQL expression when the action policy has a matcher',
    async ({ apiServices }) => {
      // Switch to the matcher policy so np-1 doesn't match the same episodes.
      await apiServices.alertingV2.actionPolicies.disable(ACTION_POLICY_ID);
      await apiServices.alertingV2.actionPolicies.enable(ACTION_POLICY_MATCHER_ID);

      const ts = (sec: number) => relativeTime(sec);
      // 3 episodes, 2 critical and 1 warning. Matcher `data.severity: "critical"`
      // should let the 2 critical episodes through and mark the warning as
      // unmatched.
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-matcher',
          groupHash: 'rule-matcher-series-1',
          episodeId: 'rule-matcher-s1-ep1',
          episodeStatus: 'active',
          status: 'breached',
          data: { severity: 'critical' },
          timestamp: ts(60),
        }),
        buildAlertEvent({
          ruleId: 'rule-matcher',
          groupHash: 'rule-matcher-series-1',
          episodeId: 'rule-matcher-s1-ep2',
          episodeStatus: 'active',
          status: 'breached',
          data: { severity: 'critical' },
          timestamp: ts(45),
        }),
        buildAlertEvent({
          ruleId: 'rule-matcher',
          groupHash: 'rule-matcher-series-1',
          episodeId: 'rule-matcher-s1-ep3',
          episodeStatus: 'active',
          status: 'breached',
          data: { severity: 'warning' },
          timestamp: ts(30),
        }),
      ]);

      await apiServices.alertingV2.alertActions.waitForAtLeast(3, {
        ruleId: 'rule-matcher',
        actionTypes: ['fire', 'unmatched'],
      });

      const actions = await apiServices.alertingV2.alertActions.find({
        ruleId: 'rule-matcher',
        actionTypes: ['fire', 'unmatched'],
      });

      const fireActions = actions.filter((action) => action.action_type === 'fire');
      const unmatchedActions = actions.filter((action) => action.action_type === 'unmatched');

      expect(fireActions).toHaveLength(2);
      for (const action of fireActions) {
        expect(action).toMatchObject({
          rule_id: 'rule-matcher',
          action_type: 'fire',
          actor: 'system',
          source: 'internal',
        });
      }

      expect(unmatchedActions).toHaveLength(1);
      expect(unmatchedActions[0]).toMatchObject({
        rule_id: 'rule-matcher',
        action_type: 'unmatched',
      });
    }
  );

  apiTest(
    'groups episodes by the specified data fields when the action policy has groupBy fields',
    async ({ apiServices }) => {
      await apiServices.alertingV2.actionPolicies.disable(ACTION_POLICY_ID);
      await apiServices.alertingV2.actionPolicies.enable(ACTION_POLICY_GROUPBY_ID);
      await apiServices.alertingV2.actionPolicies.patch(ACTION_POLICY_GROUPBY_ID, {
        throttle: { strategy: 'time_interval', interval: '1h' },
      });

      const ts = (sec: number) => relativeTime(sec);
      // 4 episodes across 4 series, but grouped into 2 hosts. With
      // `groupBy: ['data.host.name']`, the dispatcher should produce 2 action
      // groups (one notified per host).
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-groupby',
          groupHash: 'rule-groupby-series-1',
          episodeId: 'rule-groupby-s1-ep1',
          episodeStatus: 'active',
          status: 'breached',
          data: { 'host.name': 'server-1' },
          timestamp: ts(60),
        }),
        buildAlertEvent({
          ruleId: 'rule-groupby',
          groupHash: 'rule-groupby-series-2',
          episodeId: 'rule-groupby-s2-ep1',
          episodeStatus: 'active',
          status: 'breached',
          data: { 'host.name': 'server-1' },
          timestamp: ts(45),
        }),
        buildAlertEvent({
          ruleId: 'rule-groupby',
          groupHash: 'rule-groupby-series-3',
          episodeId: 'rule-groupby-s3-ep1',
          episodeStatus: 'active',
          status: 'breached',
          data: { 'host.name': 'server-2' },
          timestamp: ts(30),
        }),
        buildAlertEvent({
          ruleId: 'rule-groupby',
          groupHash: 'rule-groupby-series-4',
          episodeId: 'rule-groupby-s4-ep1',
          episodeStatus: 'active',
          status: 'breached',
          data: { 'host.name': 'server-2' },
          timestamp: ts(15),
        }),
      ]);

      const fireActions = await expectStableCount(apiServices, 4, {
        ruleId: 'rule-groupby',
        actionType: 'fire',
      });
      for (const action of fireActions) {
        expect(action).toMatchObject({
          rule_id: 'rule-groupby',
          action_type: 'fire',
          actor: 'system',
          source: 'internal',
        });
      }

      const notifiedActions = await apiServices.alertingV2.alertActions.find({
        ruleId: 'rule-groupby',
        actionType: 'notified',
      });
      expect(notifiedActions).toHaveLength(2);

      const groupIds = notifiedActions.map((action) => action.action_group_id);
      expect(new Set(groupIds).size).toBe(2);
      for (const action of notifiedActions) {
        expect(action).toMatchObject({
          action_type: 'notified',
          rule_id: 'rule-groupby',
          actor: 'system',
          source: 'internal',
        });
      }
    }
  );

  apiTest(
    'throttle strategies / per_episode + on_status_change throttles on a second dispatch when status is unchanged',
    async ({ apiServices }) => {
      await apiServices.alertingV2.actionPolicies.patch(ACTION_POLICY_ID, {
        throttle: { strategy: 'on_status_change' },
      });

      const ts = (sec: number) => relativeTime(sec);
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-3',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: ts(10),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-2',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: ts(45),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-1',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: ts(85),
        }),
      ]);

      // 3 fires + steady state for several dispatcher ticks.
      const fires = await expectStableCount(apiServices, 3, {
        ruleId: 'rule-1',
        actionType: 'fire',
      });
      expect(fires).toHaveLength(3);
    }
  );

  apiTest(
    'throttle strategies / per_episode + per_status_interval throttles within the interval when status is unchanged',
    async ({ apiServices }) => {
      await apiServices.alertingV2.actionPolicies.patch(ACTION_POLICY_ID, {
        throttle: { strategy: 'per_status_interval', interval: '1h' },
      });

      const ts = (sec: number) => relativeTime(sec);
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-3',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: ts(10),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-2',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: ts(45),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-1',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: ts(85),
        }),
      ]);

      const fires = await expectStableCount(apiServices, 3, {
        ruleId: 'rule-1',
        actionType: 'fire',
      });
      expect(fires).toHaveLength(3);

      const notifiedActions = await apiServices.alertingV2.alertActions.find({
        ruleId: 'rule-1',
        actionType: 'notified',
      });
      for (const action of notifiedActions) {
        expect(typeof action.action_group_id).toBe('string');
        expect(typeof action.episode_status).toBe('string');
      }
    }
  );

  apiTest(
    'throttle strategies / per_episode + every_time dispatches a new event even when the episode status is unchanged',
    async ({ apiServices }) => {
      await apiServices.alertingV2.actionPolicies.patch(ACTION_POLICY_ID, {
        throttle: { strategy: 'every_time' },
      });

      const baseTime = Date.now();
      const ts = (sec: number) => relativeTime(sec, baseTime);
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-3',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: ts(60),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-2',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: ts(80),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-1',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: ts(120),
        }),
      ]);

      await apiServices.alertingV2.alertActions.waitForAtLeast(3, {
        ruleId: 'rule-1',
        actionType: 'fire',
      });

      const initialFires = await apiServices.alertingV2.alertActions.find({
        ruleId: 'rule-1',
        actionType: 'fire',
      });
      const initialMaxFireTs = Math.max(
        ...initialFires.map((action) => Date.parse(action.last_series_event_timestamp))
      );

      // Same episode, same status, but a strictly newer @timestamp. Under
      // `every_time`, the dispatcher must still produce a new fire.
      const newEventTs = new Date(initialMaxFireTs + 5_000).toISOString();
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-3',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: newEventTs,
        }),
      ]);

      await apiServices.alertingV2.alertActions.waitForAtLeast(4, {
        ruleId: 'rule-1',
        actionType: 'fire',
      });
    }
  );

  apiTest(
    'throttle strategies / all + time_interval digest groups all episodes and stays throttled on subsequent dispatches',
    async ({ apiServices }) => {
      await apiServices.alertingV2.actionPolicies.patch(ACTION_POLICY_ID, {
        groupingMode: 'all',
        throttle: { strategy: 'time_interval', interval: '1h' },
      });

      const ts = (sec: number) => relativeTime(sec);
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-3',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: ts(10),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-2',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: ts(45),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-1',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: ts(85),
        }),
      ]);

      // Digest mode dispatches one notified per policy run while still
      // writing one fire per episode.
      const fires = await expectStableCount(apiServices, 3, {
        ruleId: 'rule-1',
        actionType: 'fire',
      });
      expect(fires).toHaveLength(3);

      const notifiedActions = await apiServices.alertingV2.alertActions.find({
        ruleId: 'rule-1',
        actionType: 'notified',
      });
      expect(notifiedActions).toHaveLength(1);
    }
  );

  apiTest(
    'throttle strategies / per_field + time_interval throttles groups on subsequent dispatches within the interval',
    async ({ apiServices }) => {
      await apiServices.alertingV2.actionPolicies.disable(ACTION_POLICY_ID);
      await apiServices.alertingV2.actionPolicies.enable(ACTION_POLICY_GROUPBY_ID);
      await apiServices.alertingV2.actionPolicies.patch(ACTION_POLICY_GROUPBY_ID, {
        throttle: { strategy: 'time_interval', interval: '1h' },
      });

      const ts = (sec: number) => relativeTime(sec);
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-groupby',
          groupHash: 'rule-groupby-series-1',
          episodeId: 'rule-groupby-s1-ep1',
          episodeStatus: 'active',
          status: 'breached',
          data: { 'host.name': 'server-1' },
          timestamp: ts(60),
        }),
        buildAlertEvent({
          ruleId: 'rule-groupby',
          groupHash: 'rule-groupby-series-2',
          episodeId: 'rule-groupby-s2-ep1',
          episodeStatus: 'active',
          status: 'breached',
          data: { 'host.name': 'server-1' },
          timestamp: ts(45),
        }),
        buildAlertEvent({
          ruleId: 'rule-groupby',
          groupHash: 'rule-groupby-series-3',
          episodeId: 'rule-groupby-s3-ep1',
          episodeStatus: 'active',
          status: 'breached',
          data: { 'host.name': 'server-2' },
          timestamp: ts(30),
        }),
        buildAlertEvent({
          ruleId: 'rule-groupby',
          groupHash: 'rule-groupby-series-4',
          episodeId: 'rule-groupby-s4-ep1',
          episodeStatus: 'active',
          status: 'breached',
          data: { 'host.name': 'server-2' },
          timestamp: ts(15),
        }),
      ]);

      const fires = await expectStableCount(apiServices, 4, {
        ruleId: 'rule-groupby',
        actionType: 'fire',
      });
      expect(fires).toHaveLength(4);

      const notified = await apiServices.alertingV2.alertActions.find({
        ruleId: 'rule-groupby',
        actionType: 'notified',
      });
      // Two host groups → exactly two notified actions across the entire
      // throttle interval, regardless of how many dispatcher ticks observe
      // the same episodes.
      expect(notified).toHaveLength(2);
    }
  );
});
