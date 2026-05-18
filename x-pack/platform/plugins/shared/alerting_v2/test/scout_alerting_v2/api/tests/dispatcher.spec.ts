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
import type { AlertEvent } from '../../../../server/resources/datastreams/alert_events';
import type { AlertAction } from '../../../../server/resources/datastreams/alert_actions';
import type { AlertActionsFilter } from '../../common/services';
import type { AlertingApiServicesFixture } from '../fixtures';
import { apiTest, buildCreateRuleData, testData } from '../fixtures';

const { POLL_INTERVAL_MS, POLL_TIMEOUT_MS } = testData;

/**
 * Time-based wait used by tests that assert an exact count of side-effect
 * actions, where the next dispatcher tick must not produce extras. Sized to
 * comfortably cover ~1 dispatcher tick (SCHEDULE_INTERVAL is 5s) so a
 * regression that incorrectly produced extra actions has time to surface
 * before we lock in the count.
 */
const WAIT_TIME_MS = 12_000;

const ACTION_POLICY_ID = 'np-1';
const ACTION_POLICY_MATCHER_ID = 'np-matcher';
const ACTION_POLICY_GROUPBY_ID = 'np-groupby';

/**
 * Test rule identifiers. Each rule is upserted with these fixed ids in
 * `beforeAll` and immediately bulk-disabled so the rule executor task does
 * not write extra events into `.rule-events` while these tests seed
 * synthetic events.
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
  'rule-006',
  'rule-007',
  'rule-008',
  'rule-matcher',
  'rule-groupby',
  'rule-mw',
] as const;

/** Returns an ISO timestamp `secondsAgo` seconds in the past, relative to `base`. */
const relativeTime = (secondsAgo: number, base: number = Date.now()): string =>
  new Date(base - secondsAgo * 1000).toISOString();

interface BuildAlertEventInput {
  ruleId: AlertEvent['rule']['id'];
  groupHash: AlertEvent['group_hash'];
  episodeId: NonNullable<AlertEvent['episode']>['id'];
  episodeStatus: NonNullable<AlertEvent['episode']>['status'];
  status: AlertEvent['status'];
  data?: AlertEvent['data'];
  timestamp: AlertEvent['@timestamp'];
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
  ruleId: AlertAction['rule_id'];
  groupHash: AlertAction['group_hash'];
  episodeId?: AlertAction['episode_id'];
  actionType: AlertAction['action_type'];
  lastSeriesEventTimestamp: AlertAction['last_series_event_timestamp'];
  timestamp: AlertAction['@timestamp'];
  expiry?: AlertAction['expiry'];
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
  filter: AlertActionsFilter
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
    await apiServices.alertingV2.maintenanceWindows.cleanUp();
    await apiServices.alertingV2.actionPolicies.cleanUp();
    await apiServices.alertingV2.rules.cleanUp();
    await apiServices.alertingV2.ruleEvents.cleanUp();
    await apiServices.alertingV2.alertActions.cleanUp();

    // Test rules: upserted via the public API so their auth/api-key wiring
    // matches production, then immediately disabled so the executor task
    // does not pollute `.rule-events` with breach events the dispatcher
    // would race against. The dispatcher's `findByIds` returns disabled
    // rules, so suppression behavior is unaffected.
    for (const ruleId of TEST_RULE_IDS) {
      await apiServices.alertingV2.rules.upsert(
        ruleId,
        buildCreateRuleData({
          metadata: { name: `Dispatcher test ${ruleId}` },
          schedule: { every: '1d' },
          // A `WHERE rule_id == "__never_matches__"` query against an
          // existing index is the cheapest no-op: it parses, runs
          // successfully, and returns zero rows even if the executor task
          // fires before the bulkDisable below lands. (`_id` is not exposed
          // as a column in ES|QL, so referencing it triggers a
          // verification_exception.)
          evaluation: {
            query: { base: 'FROM .alert-actions | WHERE rule_id == "__never_matches__"' },
          },
          recovery_policy: { type: 'no_breach' },
          state_transition: { pending_count: 0, recovering_count: 0 },
        })
      );
    }

    await apiServices.alertingV2.rules.bulkDisable({ ids: [...TEST_RULE_IDS] });

    // Action policies: seed with the same logical IDs the dispatcher Jest
    // tests used so reasoning ("notified by policy np-1", etc.) carries over.
    await apiServices.alertingV2.actionPolicies.upsert(ACTION_POLICY_ID, {
      name: 'Test Policy',
      description: 'Default test action policy',
      destinations: [{ type: 'workflow', id: 'test-workflow' }],
    });

    await apiServices.alertingV2.actionPolicies.upsert(ACTION_POLICY_MATCHER_ID, {
      name: 'Matcher Policy',
      description: 'Only matches critical severity',
      destinations: [{ type: 'workflow', id: 'test-workflow' }],
      matcher: 'data.severity: "critical"',
    });
    await apiServices.alertingV2.actionPolicies.disable(ACTION_POLICY_MATCHER_ID);

    await apiServices.alertingV2.actionPolicies.upsert(ACTION_POLICY_GROUPBY_ID, {
      name: 'GroupBy Policy',
      description: 'Groups by host.name',
      destinations: [{ type: 'workflow', id: 'test-workflow' }],
      groupBy: ['data.host.name'],
      groupingMode: 'per_field',
    });
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
    await apiServices.alertingV2.maintenanceWindows.cleanUp();
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
      // 3 episodes for rule-1, mirroring ALERT_EVENTS_TEST_DATA from the Jest
      // test. Timestamps are captured once and reused in the assertions so we
      // compare against the exact strings written to `.alert-actions` (calling
      // `relativeTime` again at expect time would drift by the seed→assert
      // wall-clock delta and break strict equality).
      //
      //  - episode-3 active                           (latest @ -10s)
      //  - episode-2 active -> inactive (collapsed)   (latest @ -45s)
      //  - episode-1 active -> inactive (collapsed)   (latest @ -85s)
      const tsEp3Active = relativeTime(10);
      const tsEp2Inactive = relativeTime(45);
      const tsEp2Active = relativeTime(50);
      const tsEp1Inactive = relativeTime(85);
      const tsEp1Active = relativeTime(90);

      const events: AlertEvent[] = [
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-3',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: tsEp3Active,
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-2',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: tsEp2Inactive,
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-2',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: tsEp2Active,
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-1',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: tsEp1Inactive,
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-1',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: tsEp1Active,
        }),
      ];

      await apiServices.alertingV2.ruleEvents.seed(events);

      const fireActions = await expectStableCount(apiServices, 3, {
        ruleId: 'rule-1',
        actionTypes: ['fire'],
      });

      for (const event of fireActions) {
        expect(event).toMatchObject({
          group_hash: 'rule-1-series-1',
          rule_id: 'rule-1',
          actor: 'system',
          action_type: 'fire',
          source: 'internal',
          reason: `dispatched by policy ${ACTION_POLICY_ID}`,
        });
      }

      // Each fire's `last_series_event_timestamp` is the COLLAPSED latest
      // event for the corresponding episode (per the dispatcher contract,
      // an episode that ended in `inactive` reports the inactive timestamp,
      // not the earlier breach timestamp).
      const fireEpisodeTimestamps = fireActions
        .map((action) => action.last_series_event_timestamp)
        .sort();
      expect(fireEpisodeTimestamps).toStrictEqual(
        [tsEp1Inactive, tsEp2Inactive, tsEp3Active].sort()
      );

      // Each dispatch produces one fire per episode and one notified per
      // action group; with `per_episode` grouping (the default for np-1) the
      // notified action carries both `action_group_id` and `episode_status`.
      const notifiedActions = await apiServices.alertingV2.alertActions.find({
        ruleId: 'rule-1',
        actionTypes: ['notified'],
      });
      expect(notifiedActions).toHaveLength(3);
      const notifiedEpisodeStatuses = new Set<string>();
      for (const action of notifiedActions) {
        expect(action).toMatchObject({
          rule_id: 'rule-1',
          action_type: 'notified',
          actor: 'system',
          source: 'internal',
          reason: `notified by policy ${ACTION_POLICY_ID}`,
        });
        expect(typeof action.action_group_id).toBe('string');
        expect(typeof action.episode_status).toBe('string');
        notifiedEpisodeStatuses.add(action.episode_status as string);
      }
      // Two episodes ended `inactive`, one stayed `active` — both statuses
      // must be observed on notified actions.
      expect([...notifiedEpisodeStatuses].sort()).toStrictEqual(['active', 'inactive']);
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
        actionTypes: ['notified'],
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
        // `np-1` defaults to `per_episode` grouping, so the dispatcher
        // attaches the episode's current status to every notified row.
        expect(typeof action.episode_status).toBe('string');
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
        actionTypes: ['fire'],
      });

      // Capture the latest fire timestamp so we can scope the post-seed
      // assertion to events strictly newer than the initial dispatch run.
      const initialFires = await apiServices.alertingV2.alertActions.find({
        ruleId: 'rule-1',
        actionTypes: ['fire'],
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
              actionTypes: ['fire'],
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
        ruleId: BuildAlertEventInput['ruleId'],
        groupHash: BuildAlertEventInput['groupHash'],
        episodeId: BuildAlertEventInput['episodeId'],
        startSecondsAgo: number,
        episodeStatus: BuildAlertEventInput['episodeStatus'] = 'active',
        status: BuildAlertEventInput['status'] = 'breached'
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

      // rule-001: fire (ack/unack cancels suppression). The fire action's
      // `reason` proves it was dispatched (not suppressed by the prior ack).
      expect(dispatched).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'rule-001',
            group_hash: 'rule-001-series-1',
            action_type: 'fire',
            actor: 'system',
            source: 'internal',
            reason: `dispatched by policy ${ACTION_POLICY_ID}`,
          }),
        ])
      );

      // rule-002: suppress (ack with no unack). `reason: 'ack'` is the
      // contract — the dispatcher reports WHY a row was suppressed so SREs
      // can correlate the action back to the user action that caused it.
      expect(dispatched).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'rule-002',
            group_hash: 'rule-002-series-1',
            action_type: 'suppress',
            reason: 'ack',
          }),
        ])
      );

      // rule-003: 3 fires across 2 series (series-1 active, series-2 ep1 inactive, ep2 active)
      const rule003Fires = fireActions.filter((action) => action.rule_id === 'rule-003');
      expect(rule003Fires).toHaveLength(3);

      // rule-004: both series suppress (snoozed with null episode_id and
      // expiry far in the future). Snoozes are series-scoped, so both series
      // are suppressed with `reason: 'snooze'`.
      expect(dispatched).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'rule-004',
            group_hash: 'rule-004-series-1',
            action_type: 'suppress',
            reason: 'snooze',
          }),
          expect.objectContaining({
            rule_id: 'rule-004',
            group_hash: 'rule-004-series-2',
            action_type: 'suppress',
            reason: 'snooze',
          }),
        ])
      );

      // rule-005: series-1 suppress (deactivated → `reason: 'deactivate'`),
      // series-2 fire (no user actions touched it).
      expect(dispatched).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'rule-005',
            group_hash: 'rule-005-series-1',
            action_type: 'suppress',
            reason: 'deactivate',
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
    'lifts suppression when the last user action is an unsnooze, an expired snooze, or an activate',
    async ({ apiServices }) => {
      const baseTime = Date.now();
      const eventTs = (sec: number) => relativeTime(sec, baseTime);
      const actionTs = (sec: number) => relativeTime(sec, baseTime);

      // One active episode per rule. Each rule pairs a "would suppress"
      // user action with the cancelling one (or makes it ineligible via an
      // expired `expiry`). The dispatcher must produce a `fire` for every
      // rule — proving the cancellation logic actually lifts suppression
      // rather than just defaulting to "no suppression record found".
      const events: AlertEvent[] = [
        buildAlertEvent({
          ruleId: 'rule-006',
          groupHash: 'rule-006-series-1',
          episodeId: 'rule-006-series-1-episode-1',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: eventTs(60),
        }),
        buildAlertEvent({
          ruleId: 'rule-007',
          groupHash: 'rule-007-series-1',
          episodeId: 'rule-007-series-1-episode-1',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: eventTs(60),
        }),
        buildAlertEvent({
          ruleId: 'rule-008',
          groupHash: 'rule-008-series-1',
          episodeId: 'rule-008-series-1-episode-1',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: eventTs(60),
        }),
      ];
      await apiServices.alertingV2.ruleEvents.seed(events);

      const futureExpiry = new Date(baseTime + 24 * 60 * 60 * 1000).toISOString();
      // `expiry` for the expired-snooze must be strictly before the event's
      // `@timestamp`. The dispatcher's suppression ESQL drops snooze rows
      // whose `expiry` is at or before the batch's MIN episode timestamp.
      const pastExpiry = new Date('2020-01-01T00:00:00.000Z').toISOString();
      const userActions: AlertAction[] = [
        // rule-006: snooze then unsnooze → last snooze action = "unsnooze" → fire
        buildAlertAction({
          ruleId: 'rule-006',
          groupHash: 'rule-006-series-1',
          actionType: 'snooze',
          lastSeriesEventTimestamp: eventTs(60),
          timestamp: actionTs(50),
          expiry: futureExpiry,
        }),
        buildAlertAction({
          ruleId: 'rule-006',
          groupHash: 'rule-006-series-1',
          actionType: 'unsnooze',
          lastSeriesEventTimestamp: eventTs(60),
          timestamp: actionTs(30),
        }),
        // rule-007: expired snooze (expiry well in the past) → filtered out by
        // the suppression query → no suppression record → fire
        buildAlertAction({
          ruleId: 'rule-007',
          groupHash: 'rule-007-series-1',
          actionType: 'snooze',
          lastSeriesEventTimestamp: eventTs(60),
          timestamp: actionTs(50),
          expiry: pastExpiry,
        }),
        // rule-008: deactivate then activate → last deactivate action = "activate" → fire
        buildAlertAction({
          ruleId: 'rule-008',
          groupHash: 'rule-008-series-1',
          episodeId: 'rule-008-series-1-episode-1',
          actionType: 'deactivate',
          lastSeriesEventTimestamp: eventTs(60),
          timestamp: actionTs(50),
        }),
        buildAlertAction({
          ruleId: 'rule-008',
          groupHash: 'rule-008-series-1',
          episodeId: 'rule-008-series-1-episode-1',
          actionType: 'activate',
          lastSeriesEventTimestamp: eventTs(60),
          timestamp: actionTs(30),
        }),
      ];
      await apiServices.alertingV2.alertActions.seed(userActions);

      await apiServices.alertingV2.alertActions.waitForAtLeast(3, {
        actionTypes: ['fire'],
      });

      const dispatched = await apiServices.alertingV2.alertActions.find({
        actionTypes: ['fire', 'suppress'],
      });

      // Each rule must produce exactly one fire and zero suppress.
      for (const ruleId of ['rule-006', 'rule-007', 'rule-008']) {
        const fires = dispatched.filter(
          (action) => action.rule_id === ruleId && action.action_type === 'fire'
        );
        const suppresses = dispatched.filter(
          (action) => action.rule_id === ruleId && action.action_type === 'suppress'
        );
        expect(fires).toHaveLength(1);
        expect(suppresses).toHaveLength(0);
        expect(fires[0]).toMatchObject({
          rule_id: ruleId,
          action_type: 'fire',
          actor: 'system',
          source: 'internal',
          reason: `dispatched by policy ${ACTION_POLICY_ID}`,
        });
      }
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
          reason: `dispatched by policy ${ACTION_POLICY_MATCHER_ID}`,
        });
      }

      // Unmatched rows are the dispatcher's audit trail for episodes that
      // satisfied every other gate but were filtered out by the policy's
      // matcher KQL. The fixed `reason` string is part of the contract
      // SREs read in dashboards.
      expect(unmatchedActions).toHaveLength(1);
      expect(unmatchedActions[0]).toMatchObject({
        rule_id: 'rule-matcher',
        action_type: 'unmatched',
        reason: 'no matching action policy',
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
        actionTypes: ['fire'],
      });
      for (const action of fireActions) {
        expect(action).toMatchObject({
          rule_id: 'rule-groupby',
          action_type: 'fire',
          actor: 'system',
          source: 'internal',
          reason: `dispatched by policy ${ACTION_POLICY_GROUPBY_ID}`,
        });
      }

      const notifiedActions = await apiServices.alertingV2.alertActions.find({
        ruleId: 'rule-groupby',
        actionTypes: ['notified'],
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
          reason: `notified by policy ${ACTION_POLICY_GROUPBY_ID}`,
        });
        expect(typeof action.action_group_id).toBe('string');
        // `per_field` grouping intentionally OMITS `episode_status` on the
        // notified row — the action represents a group of episodes, not a
        // single episode, so no single status applies.
        expect(action.episode_status).toBeUndefined();
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
        actionTypes: ['fire'],
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
        actionTypes: ['fire'],
      });
      expect(fires).toHaveLength(3);

      const notifiedActions = await apiServices.alertingV2.alertActions.find({
        ruleId: 'rule-1',
        actionTypes: ['notified'],
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
        actionTypes: ['fire'],
      });

      const initialFires = await apiServices.alertingV2.alertActions.find({
        ruleId: 'rule-1',
        actionTypes: ['fire'],
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
        actionTypes: ['fire'],
      });

      const finalFires = await apiServices.alertingV2.alertActions.find({
        ruleId: 'rule-1',
        actionTypes: ['fire'],
      });
      expect(finalFires.length).toBeGreaterThanOrEqual(4);
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
        actionTypes: ['fire'],
      });
      expect(fires).toHaveLength(3);

      const notifiedActions = await apiServices.alertingV2.alertActions.find({
        ruleId: 'rule-1',
        actionTypes: ['notified'],
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
        actionTypes: ['fire'],
      });
      expect(fires).toHaveLength(4);

      const notified = await apiServices.alertingV2.alertActions.find({
        ruleId: 'rule-groupby',
        actionTypes: ['notified'],
      });
      // Two host groups → exactly two notified actions across the entire
      // throttle interval, regardless of how many dispatcher ticks observe
      // the same episodes.
      expect(notified).toHaveLength(2);
    }
  );

  // The dispatcher's `MaintenanceWindowService` caches enabled maintenance
  // windows in memory for `DEFAULT_MAINTENANCE_WINDOW_CACHE_INTERVAL_MS`
  // (60s). With Kibana running long-lived against this test, the cache is
  // almost certainly already populated with "no MWs" when we start. We
  // therefore must wait for one cache TTL after creating the MW before the
  // dispatcher's next tick can re-fetch and observe it.
  //
  // Side effect: this is the SLOWEST test in the suite (~70-80s wall
  // clock). It is intentionally placed last so it does not interleave its
  // MW with other tests' alert events, and so its long wait does not block
  // earlier assertions.
  const MW_CACHE_WAIT_MS = 65_000;

  apiTest(
    'suppresses dispatch with `reason: maintenance_window:<id>` when an enabled maintenance window covers the alert events',
    async ({ apiServices }) => {
      apiTest.setTimeout(180_000);

      const mwStart = new Date();
      const mw = await apiServices.alertingV2.maintenanceWindows.create({
        title: 'dispatcher-mw-suppress-test',
        enabled: true,
        schedule: {
          custom: {
            start: mwStart.toISOString(),
            duration: '10m',
          },
        },
      });

      try {
        await wait(MW_CACHE_WAIT_MS);

        // Events must have `@timestamp` inside the MW's materialised event
        // window [mwStart, mwStart+10m]. We choose timestamps a few seconds
        // after `mwStart` so they fall well within the window even
        // accounting for clock drift between the test runner and Kibana.
        const eventTs = (offsetSec: number) =>
          new Date(mwStart.getTime() + offsetSec * 1000).toISOString();

        await apiServices.alertingV2.ruleEvents.seed([
          buildAlertEvent({
            ruleId: 'rule-mw',
            groupHash: 'rule-mw-series-1',
            episodeId: 'rule-mw-series-1-episode-1',
            episodeStatus: 'active',
            status: 'breached',
            timestamp: eventTs(10),
          }),
          buildAlertEvent({
            ruleId: 'rule-mw',
            groupHash: 'rule-mw-series-1',
            episodeId: 'rule-mw-series-1-episode-2',
            episodeStatus: 'active',
            status: 'breached',
            timestamp: eventTs(20),
          }),
          buildAlertEvent({
            ruleId: 'rule-mw',
            groupHash: 'rule-mw-series-1',
            episodeId: 'rule-mw-series-1-episode-3',
            episodeStatus: 'active',
            status: 'breached',
            timestamp: eventTs(30),
          }),
        ]);

        await apiServices.alertingV2.alertActions.waitForAtLeast(3, {
          ruleId: 'rule-mw',
          actionTypes: ['suppress'],
        });

        const suppressActions = await apiServices.alertingV2.alertActions.find({
          ruleId: 'rule-mw',
          actionTypes: ['suppress'],
        });

        expect(suppressActions).toHaveLength(3);
        for (const action of suppressActions) {
          expect(action).toMatchObject({
            rule_id: 'rule-mw',
            group_hash: 'rule-mw-series-1',
            action_type: 'suppress',
            actor: 'system',
            source: 'internal',
            reason: `maintenance_window:${mw.id}`,
          });
        }

        // A fire action for `rule-mw` would mean the MW gate let an
        // episode through, defeating the purpose of the maintenance
        // window.
        const fires = await apiServices.alertingV2.alertActions.find({
          ruleId: 'rule-mw',
          actionTypes: ['fire'],
        });
        expect(fires).toHaveLength(0);
      } finally {
        await apiServices.alertingV2.maintenanceWindows.delete(mw.id);
      }
    }
  );
});
