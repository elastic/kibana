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

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { AlertEvent } from '../../../../server/resources/datastreams/alert_events';
import type { AlertAction } from '../../../../server/resources/datastreams/alert_actions';
import { LOOKBACK_WINDOW_MINUTES } from '../../../../server/lib/dispatcher/constants';
import type { AlertActionsFilter } from '../../common/services';
import type { AlertingApiServicesFixture } from '../fixtures';
import { apiTest, buildCreateRuleData, testData } from '../fixtures';

const { POLL_INTERVAL_MS, POLL_TIMEOUT_MS } = testData;

const ACTION_POLICY_ID = 'np-1';
const ACTION_POLICY_MATCHER_ID = 'np-matcher';
const ACTION_POLICY_GROUPBY_ID = 'np-groupby';

/**
 * Test-only ad-hoc policies. They are upserted (disabled) in `beforeAll`
 * alongside the fixture policies so that:
 *  - `afterAll`'s `actionPolicies.cleanUp()` removes them with the rest.
 *  - `beforeEach` resets each one to disabled, keeping per-test isolation
 *    without forcing individual tests to wrap setup in `try/finally`.
 * Each test enables only what it needs.
 */
const SINGLE_RULE_POLICY_ID = 'np-single-rule';
const SECOND_POLICY_ID = 'np-second-catch-all';
const MISSING_WORKFLOW_POLICY_ID = 'np-missing-workflow';

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
 * Polls `apiServices.alertingV2.alertActionsEvents.find(...)` until the count matches
 * `expected`, then waits for one more dispatcher tick to surface any extras
 * a regression might produce, and finally asserts the count is exactly
 * `expected`. Use this when a test asserts an exact number of side-effect
 * actions (the next dispatcher tick must not produce extras).
 */
const expectStableCount = async (
  apiServices: AlertingApiServicesFixture,
  expected: number,
  filter: AlertActionsFilter
): Promise<AlertAction[]> => {
  await apiServices.alertingV2.alertActionsEvents.waitForAtLeast(expected, filter);
  await apiServices.alertingV2.dispatcher.waitForDispatcherTick();

  const actions = await apiServices.alertingV2.alertActionsEvents.find(filter);

  expect(actions).toHaveLength(expected);

  return actions;
};

apiTest.describe('Dispatcher', { tag: tags.stateful.classic }, () => {
  apiTest.beforeAll(async ({ apiServices }) => {
    await apiServices.alertingV2.maintenanceWindows.cleanUp();
    await apiServices.alertingV2.actionPolicies.cleanUp();
    await apiServices.alertingV2.rules.cleanUp();
    await apiServices.alertingV2.ruleEvents.cleanUp();
    await apiServices.alertingV2.alertActionsEvents.cleanUp();

    for (const ruleId of TEST_RULE_IDS) {
      await apiServices.alertingV2.rules.upsert(
        ruleId,
        buildCreateRuleData({
          metadata: { name: `Dispatcher test ${ruleId}` },
          schedule: { every: '1d' },
          // A `WHERE rule_id == "__never_matches__"` query against an
          // existing index is the cheapest no-op: it parses, runs
          // successfully, and returns zero rows even if the executor task
          // fires before the bulkDisable below lands.
          query: {
            format: 'standalone',
            breach: { query: 'FROM .alert-actions | WHERE rule_id == "__never_matches__"' },
          },
          state_transition: { pending_count: 0, recovering_count: 0 },
        })
      );
    }

    await apiServices.alertingV2.rules.bulkDisable({ ids: [...TEST_RULE_IDS] });

    await apiServices.alertingV2.actionPolicies.upsert(ACTION_POLICY_ID, {
      name: 'Test Policy',
      description: 'Default test action policy',
      destinations: [{ type: 'workflow', id: 'test-workflow' }],
    });

    await apiServices.alertingV2.actionPolicies.disable(ACTION_POLICY_ID);

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

    await apiServices.alertingV2.actionPolicies.upsert(SINGLE_RULE_POLICY_ID, {
      name: 'Rule-scoped policy bound to rule-001',
      description: 'Must filter to its linked rule only',
      destinations: [{ type: 'workflow', id: 'test-workflow' }],
      matcher: 'rule.id: "rule-001"',
    });

    await apiServices.alertingV2.actionPolicies.disable(SINGLE_RULE_POLICY_ID);

    await apiServices.alertingV2.actionPolicies.upsert(SECOND_POLICY_ID, {
      name: 'Second catch-all policy',
      description: 'Verifies multi-policy dispatch for one episode',
      destinations: [{ type: 'workflow', id: 'test-workflow' }],
    });

    await apiServices.alertingV2.actionPolicies.disable(SECOND_POLICY_ID);

    await apiServices.alertingV2.actionPolicies.upsert(MISSING_WORKFLOW_POLICY_ID, {
      name: 'Missing-workflow policy',
      description: 'Destination ID is guaranteed not to exist',
      destinations: [{ type: 'workflow', id: 'guaranteed-missing-workflow-xyz' }],
    });

    await apiServices.alertingV2.actionPolicies.disable(MISSING_WORKFLOW_POLICY_ID);
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.alertActionsEvents.cleanUp();
    await apiServices.alertingV2.ruleEvents.cleanUp();
    await apiServices.alertingV2.maintenanceWindows.cleanUp();

    await apiServices.alertingV2.actionPolicies.patch(ACTION_POLICY_ID, {
      throttle: null,
      groupingMode: 'per_episode',
    });

    await apiServices.alertingV2.actionPolicies.enable(ACTION_POLICY_ID);
    // Restore np-1 in case a previous test left it snoozed. Idempotent.
    await apiServices.alertingV2.actionPolicies.unsnooze(ACTION_POLICY_ID);

    await apiServices.alertingV2.actionPolicies.disable(ACTION_POLICY_MATCHER_ID);
    await apiServices.alertingV2.actionPolicies.patch(ACTION_POLICY_GROUPBY_ID, { throttle: null });
    await apiServices.alertingV2.actionPolicies.disable(ACTION_POLICY_GROUPBY_ID);

    await apiServices.alertingV2.actionPolicies.disable(SINGLE_RULE_POLICY_ID);
    await apiServices.alertingV2.actionPolicies.disable(SECOND_POLICY_ID);
    await apiServices.alertingV2.actionPolicies.disable(MISSING_WORKFLOW_POLICY_ID);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.alertActionsEvents.cleanUp();
    await apiServices.alertingV2.ruleEvents.cleanUp();
    await apiServices.alertingV2.rules.cleanUp();
    await apiServices.alertingV2.actionPolicies.cleanUp();
    await apiServices.alertingV2.maintenanceWindows.cleanUp();
  });

  apiTest(
    'does not dispatch any episodes when there are no alert events',
    async ({ apiServices }) => {
      // Wait for two dispatcher ticks instead of one: the first tick may
      // overlap with `beforeEach` cleanup, so two ticks both prove the
      // dispatcher actually ran and give a regression a second chance to
      // surface stray actions.
      await apiServices.alertingV2.dispatcher.waitForDispatcherTick({ ticks: 2 });

      const actions = await apiServices.alertingV2.alertActionsEvents.find();
      expect(actions).toHaveLength(0);
    }
  );

  apiTest(
    'dispatches all unique episodes when alert events have no prior fire actions',
    async ({ apiServices }) => {
      // 3 episodes for rule-1. Timestamps are captured once and reused in the assertions so we
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
      const notifiedActions = await apiServices.alertingV2.alertActionsEvents.find({
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
        });

        expect(action.action_group_id).toBeDefined();
        expect(action.episode_status).toBeDefined();

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

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-3',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: relativeTime(10),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-2',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: relativeTime(45),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-1',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: relativeTime(85),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-1',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: relativeTime(90),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-2',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: relativeTime(50),
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
        });

        expect(action.action_group_id).toBeDefined();
        expect(action.episode_status).toBeDefined();
        expect(action.group_hash).toBe('rule-1-series-1');
      }
    }
  );

  apiTest(
    'only dispatches the new events when some episodes already have fires',
    async ({ apiServices }) => {
      const initialEvents: AlertEvent[] = [
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-3',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: relativeTime(60),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-2',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: relativeTime(80),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-1',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: relativeTime(120),
        }),
      ];

      await apiServices.alertingV2.ruleEvents.seed(initialEvents);
      await apiServices.alertingV2.alertActionsEvents.waitForAtLeast(3, {
        ruleId: 'rule-1',
        actionTypes: ['fire'],
      });

      // Capture the latest fire timestamp so we can scope the post-seed
      // assertion to events strictly newer than the initial dispatch run.
      const initialFires = await apiServices.alertingV2.alertActionsEvents.find({
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
            const actions = await apiServices.alertingV2.alertActionsEvents.find({
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
      await apiServices.alertingV2.alertActionsEvents.seed(userActions);

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
      await apiServices.alertingV2.alertActionsEvents.waitForAtLeast(9, {
        actionTypes: ['fire', 'suppress'],
      });

      // Filter out the user actions seeded above (ack/unack/snooze/deactivate)
      // so the assertions only see dispatcher-generated fire/suppress actions.
      const dispatched = await apiServices.alertingV2.alertActionsEvents.find({
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
      await apiServices.alertingV2.alertActionsEvents.seed(userActions);

      await apiServices.alertingV2.alertActionsEvents.waitForAtLeast(3, {
        actionTypes: ['fire'],
      });

      const dispatched = await apiServices.alertingV2.alertActionsEvents.find({
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
          timestamp: relativeTime(60),
        }),
        buildAlertEvent({
          ruleId: 'rule-matcher',
          groupHash: 'rule-matcher-series-1',
          episodeId: 'rule-matcher-s1-ep2',
          episodeStatus: 'active',
          status: 'breached',
          data: { severity: 'critical' },
          timestamp: relativeTime(45),
        }),
        buildAlertEvent({
          ruleId: 'rule-matcher',
          groupHash: 'rule-matcher-series-1',
          episodeId: 'rule-matcher-s1-ep3',
          episodeStatus: 'active',
          status: 'breached',
          data: { severity: 'warning' },
          timestamp: relativeTime(30),
        }),
      ]);

      await apiServices.alertingV2.alertActionsEvents.waitForAtLeast(3, {
        ruleId: 'rule-matcher',
        actionTypes: ['fire', 'unmatched'],
      });

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
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

      // Unmatched rows are the dispatcher's audit trail for episodes that
      // satisfied every other gate but were filtered out by the policy's
      // matcher KQL. The fixed `reason` string is part of the contract
      // SREs read in dashboards.
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
          timestamp: relativeTime(60),
        }),
        buildAlertEvent({
          ruleId: 'rule-groupby',
          groupHash: 'rule-groupby-series-2',
          episodeId: 'rule-groupby-s2-ep1',
          episodeStatus: 'active',
          status: 'breached',
          data: { 'host.name': 'server-1' },
          timestamp: relativeTime(45),
        }),
        buildAlertEvent({
          ruleId: 'rule-groupby',
          groupHash: 'rule-groupby-series-3',
          episodeId: 'rule-groupby-s3-ep1',
          episodeStatus: 'active',
          status: 'breached',
          data: { 'host.name': 'server-2' },
          timestamp: relativeTime(30),
        }),
        buildAlertEvent({
          ruleId: 'rule-groupby',
          groupHash: 'rule-groupby-series-4',
          episodeId: 'rule-groupby-s4-ep1',
          episodeStatus: 'active',
          status: 'breached',
          data: { 'host.name': 'server-2' },
          timestamp: relativeTime(15),
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
        });
      }

      const notifiedActions = await apiServices.alertingV2.alertActionsEvents.find({
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
        });

        expect(action.action_group_id).toBeDefined();
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

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-3',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: relativeTime(10),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-2',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: relativeTime(45),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-1',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: relativeTime(85),
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

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-3',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: relativeTime(10),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-2',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: relativeTime(45),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-1',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: relativeTime(85),
        }),
      ]);

      const fires = await expectStableCount(apiServices, 3, {
        ruleId: 'rule-1',
        actionTypes: ['fire'],
      });
      expect(fires).toHaveLength(3);

      const notifiedActions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId: 'rule-1',
        actionTypes: ['notified'],
      });

      for (const action of notifiedActions) {
        expect(action.action_group_id).toBeDefined();
        expect(action.episode_status).toBeDefined();
      }
    }
  );

  apiTest(
    'throttle strategies / per_episode + every_time dispatches a new event even when the episode status is unchanged',
    async ({ apiServices }) => {
      await apiServices.alertingV2.actionPolicies.patch(ACTION_POLICY_ID, {
        throttle: { strategy: 'every_time' },
      });

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-3',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: relativeTime(60),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-2',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: relativeTime(80),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-1',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: relativeTime(120),
        }),
      ]);

      await apiServices.alertingV2.alertActionsEvents.waitForAtLeast(3, {
        ruleId: 'rule-1',
        actionTypes: ['fire'],
      });

      const initialFires = await apiServices.alertingV2.alertActionsEvents.find({
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

      await apiServices.alertingV2.alertActionsEvents.waitForAtLeast(4, {
        ruleId: 'rule-1',
        actionTypes: ['fire'],
      });

      const finalFires = await apiServices.alertingV2.alertActionsEvents.find({
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

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-3',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: relativeTime(10),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-2',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: relativeTime(45),
        }),
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-series-1',
          episodeId: 'rule-1-series-1-episode-1',
          episodeStatus: 'inactive',
          status: 'recovered',
          timestamp: relativeTime(85),
        }),
      ]);

      // Digest mode dispatches one notified per policy run while still
      // writing one fire per episode.
      const fires = await expectStableCount(apiServices, 3, {
        ruleId: 'rule-1',
        actionTypes: ['fire'],
      });
      expect(fires).toHaveLength(3);

      const notifiedActions = await apiServices.alertingV2.alertActionsEvents.find({
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

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-groupby',
          groupHash: 'rule-groupby-series-1',
          episodeId: 'rule-groupby-s1-ep1',
          episodeStatus: 'active',
          status: 'breached',
          data: { 'host.name': 'server-1' },
          timestamp: relativeTime(60),
        }),
        buildAlertEvent({
          ruleId: 'rule-groupby',
          groupHash: 'rule-groupby-series-2',
          episodeId: 'rule-groupby-s2-ep1',
          episodeStatus: 'active',
          status: 'breached',
          data: { 'host.name': 'server-1' },
          timestamp: relativeTime(45),
        }),
        buildAlertEvent({
          ruleId: 'rule-groupby',
          groupHash: 'rule-groupby-series-3',
          episodeId: 'rule-groupby-s3-ep1',
          episodeStatus: 'active',
          status: 'breached',
          data: { 'host.name': 'server-2' },
          timestamp: relativeTime(30),
        }),
        buildAlertEvent({
          ruleId: 'rule-groupby',
          groupHash: 'rule-groupby-series-4',
          episodeId: 'rule-groupby-s4-ep1',
          episodeStatus: 'active',
          status: 'breached',
          data: { 'host.name': 'server-2' },
          timestamp: relativeTime(15),
        }),
      ]);

      const fires = await expectStableCount(apiServices, 4, {
        ruleId: 'rule-groupby',
        actionTypes: ['fire'],
      });

      expect(fires).toHaveLength(4);

      const notified = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId: 'rule-groupby',
        actionTypes: ['notified'],
      });
      // Two host groups → exactly two notified actions across the entire
      // throttle interval, regardless of how many dispatcher ticks observe
      // the same episodes.
      expect(notified).toHaveLength(2);
    }
  );

  // The dispatcher's `MaintenanceWindowService` queries the saved-object
  // store on every tick (no caching), so a newly-created MW is visible to
  // the next dispatcher tick. The test only needs to:
  //   1. create the MW,
  //   2. wait one dispatcher tick so we know `getEnabledMaintenanceWindows`
  //      has been called at least once after the MW landed,
  //   3. seed events and assert they are suppressed.
  // Step (2) guards against the race where events are seeded so quickly
  // after MW creation that they could in principle be picked up by a tick
  // whose pipeline state was snapshotted before the MW existed.
  apiTest(
    'suppresses dispatch with `reason: maintenance_window:<id>` when an enabled maintenance window covers the alert events',
    async ({ apiServices }) => {
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

      await apiServices.alertingV2.dispatcher.waitForDispatcherTick();

      // Events must have `@timestamp` inside the MW's materialised event
      // window [mwStart, mwStart+10m]. We choose timestamps a few seconds
      // after `mwStart` so they fall well within the window even accounting
      // for clock drift between the test runner and Kibana.
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

      await apiServices.alertingV2.alertActionsEvents.waitForAtLeast(3, {
        ruleId: 'rule-mw',
        actionTypes: ['suppress'],
      });

      const suppressActions = await apiServices.alertingV2.alertActionsEvents.find({
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

      // A fire action for `rule-mw` would mean the MW gate let an episode
      // through, defeating the purpose of the maintenance window.
      const fires = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId: 'rule-mw',
        actionTypes: ['fire'],
      });

      expect(fires).toHaveLength(0);
    }
  );

  apiTest(
    'rule-scoped policy / dispatches only for the linked rule and skips unrelated rules',
    async ({ apiServices }) => {
      await apiServices.alertingV2.actionPolicies.enable(SINGLE_RULE_POLICY_ID);

      await apiServices.alertingV2.ruleEvents.seed([
        // Linked rule: matched by np-1 (catch-all) AND by the rule-scoped policy.
        buildAlertEvent({
          ruleId: 'rule-001',
          groupHash: 'rule-001-single-series',
          episodeId: 'rule-001-single-ep-1',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: relativeTime(20),
        }),
        // Unrelated rule: matched by np-1; the rule-scoped policy MUST NOT match.
        buildAlertEvent({
          ruleId: 'rule-002',
          groupHash: 'rule-002-single-series',
          episodeId: 'rule-002-single-ep-1',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: relativeTime(25),
        }),
      ]);

      const rule001Fires = await expectStableCount(apiServices, 2, {
        ruleId: 'rule-001',
        actionTypes: ['fire'],
      });

      expect(new Set(rule001Fires.map((a) => a.reason))).toStrictEqual(
        new Set([
          `dispatched by policy ${ACTION_POLICY_ID}`,
          `dispatched by policy ${SINGLE_RULE_POLICY_ID}`,
        ])
      );

      // rule-002 must produce exactly one fire (np-1 only). A second fire
      // here would mean the rule-scoped matcher leaked across rules.
      const rule002Fires = await expectStableCount(apiServices, 1, {
        ruleId: 'rule-002',
        actionTypes: ['fire'],
      });

      expect(rule002Fires[0]).toMatchObject({
        rule_id: 'rule-002',
        action_type: 'fire',
        reason: `dispatched by policy ${ACTION_POLICY_ID}`,
      });
    }
  );

  apiTest(
    'multiple policies / produces one fire per matching policy when the same episode matches both',
    async ({ apiServices }) => {
      await apiServices.alertingV2.actionPolicies.enable(SECOND_POLICY_ID);

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-multi-series',
          episodeId: 'rule-1-multi-ep-1',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: relativeTime(60),
        }),
      ]);

      // Two fires for the same episode, one per policy.
      const fires = await expectStableCount(apiServices, 2, {
        ruleId: 'rule-1',
        actionTypes: ['fire'],
      });

      expect(new Set(fires.map((a) => a.reason))).toStrictEqual(
        new Set([
          `dispatched by policy ${ACTION_POLICY_ID}`,
          `dispatched by policy ${SECOND_POLICY_ID}`,
        ])
      );

      // Two notified records (one per action group / policy), under the
      // default per_episode grouping mode.
      const notified = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId: 'rule-1',
        actionTypes: ['notified'],
      });

      expect(notified).toHaveLength(2);
      expect(new Set(notified.map((a) => a.reason))).toStrictEqual(
        new Set([
          `notified by policy ${ACTION_POLICY_ID}`,
          `notified by policy ${SECOND_POLICY_ID}`,
        ])
      );

      // No suppress / unmatched leakage from a multi-policy match.
      const otherActions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId: 'rule-1',
        actionTypes: ['suppress', 'unmatched'],
      });

      expect(otherActions).toHaveLength(0);
    }
  );

  apiTest(
    'lookback window / does not dispatch events older than the dispatcher lookback window',
    async ({ apiServices }) => {
      const beyondLookbackSeconds = (LOOKBACK_WINDOW_MINUTES + 1) * 60;

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-old-series',
          episodeId: 'rule-1-old-ep-1',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: relativeTime(beyondLookbackSeconds),
        }),
      ]);

      // Two ticks: one to exercise the lookback filter, a second to give a
      // regression that re-reads stale events a chance to surface.
      await apiServices.alertingV2.dispatcher.waitForDispatcherTick({ ticks: 2 });

      const actions = await apiServices.alertingV2.alertActionsEvents.find({ ruleId: 'rule-1' });
      expect(actions).toHaveLength(0);
    }
  );

  apiTest(
    'snoozed policy / does not dispatch when the action policy is snoozed until a future time',
    async ({ apiServices }) => {
      // `beforeEach` unsnoozes np-1 to ensure a clean starting state, so
      // this test does not need its own teardown — the next `beforeEach`
      // will restore np-1 before the following test runs.
      const snoozedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await apiServices.alertingV2.actionPolicies.snooze(ACTION_POLICY_ID, snoozedUntil);

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-snoozed-series',
          episodeId: 'rule-1-snoozed-ep-1',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: relativeTime(30),
        }),
      ]);

      // The episode lands as unmatched because every enabled policy in
      // the space is snoozed.
      const unmatched = await expectStableCount(apiServices, 1, {
        ruleId: 'rule-1',
        actionTypes: ['unmatched'],
      });

      expect(unmatched[0]).toMatchObject({
        rule_id: 'rule-1',
        action_type: 'unmatched',
      });

      const fires = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId: 'rule-1',
        actionTypes: ['fire'],
      });

      expect(fires).toHaveLength(0);
    }
  );

  apiTest(
    'missing destination / still records fire and notified actions when the destination workflow does not exist',
    async ({ apiServices }) => {
      // Disable np-1 so the only enabled policy in the space is the one with
      // the known-missing workflow id. `beforeEach` re-enables np-1 before
      // the next test runs.
      await apiServices.alertingV2.actionPolicies.disable(ACTION_POLICY_ID);
      await apiServices.alertingV2.actionPolicies.enable(MISSING_WORKFLOW_POLICY_ID);

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-missing-wf-series',
          episodeId: 'rule-1-missing-wf-ep-1',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: relativeTime(30),
        }),
      ]);

      const fires = await expectStableCount(apiServices, 1, {
        ruleId: 'rule-1',
        actionTypes: ['fire'],
      });

      expect(fires[0]).toMatchObject({
        rule_id: 'rule-1',
        action_type: 'fire',
        reason: `dispatched by policy ${MISSING_WORKFLOW_POLICY_ID}`,
      });

      const notified = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId: 'rule-1',
        actionTypes: ['notified'],
      });

      expect(notified).toHaveLength(1);
      expect(notified[0]).toMatchObject({
        rule_id: 'rule-1',
        action_type: 'notified',
        reason: `notified by policy ${MISSING_WORKFLOW_POLICY_ID}`,
      });
    }
  );

  apiTest(
    'writes a throttled-policy suppress record when on_status_change holds back an episode',
    async ({ apiServices }) => {
      await apiServices.alertingV2.actionPolicies.patch(ACTION_POLICY_ID, {
        throttle: { strategy: 'on_status_change' },
      });

      // First dispatch: the episode fires (no prior notification).
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-throttle-series',
          episodeId: 'rule-1-throttle-ep-1',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: relativeTime(60),
        }),
      ]);

      const initialFires = await expectStableCount(apiServices, 1, {
        ruleId: 'rule-1',
        actionTypes: ['fire'],
      });

      // Seed a strictly-newer event with the SAME status. The dispatcher's
      // `last_fired < @timestamp` filter lets it through to the throttle
      // gate, which must hold it back because the episode status did not
      // change.
      const newEventTs = new Date(
        Date.parse(initialFires[0].last_series_event_timestamp) + 5_000
      ).toISOString();

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-1',
          groupHash: 'rule-1-throttle-series',
          episodeId: 'rule-1-throttle-ep-1',
          episodeStatus: 'active',
          status: 'breached',
          timestamp: newEventTs,
        }),
      ]);

      // StoreActionsStep writes a throttled-policy suppress record.
      await apiServices.alertingV2.alertActionsEvents.waitForAtLeast(1, {
        ruleId: 'rule-1',
        actionTypes: ['suppress'],
      });

      // No additional fires were written — the throttle held the episode back.
      const stableFires = await expectStableCount(apiServices, 1, {
        ruleId: 'rule-1',
        actionTypes: ['fire'],
      });
      expect(stableFires).toHaveLength(1);

      const suppress = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId: 'rule-1',
        actionTypes: ['suppress'],
      });

      expect(suppress).toHaveLength(1);
      expect(suppress[0]).toMatchObject({
        rule_id: 'rule-1',
        group_hash: 'rule-1-throttle-series',
        action_type: 'suppress',
        actor: 'system',
        source: 'internal',
        reason: `suppressed by throttled policy ${ACTION_POLICY_ID}`,
      });
    }
  );

  apiTest(
    'writes an `unmatched` action record when no policy matches the rule',
    async ({ apiServices }) => {
      await apiServices.alertingV2.actionPolicies.disable(ACTION_POLICY_ID);
      await apiServices.alertingV2.actionPolicies.enable(ACTION_POLICY_MATCHER_ID);

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          ruleId: 'rule-matcher',
          groupHash: 'rule-matcher-unmatched-series',
          episodeId: 'rule-matcher-unmatched-ep-1',
          episodeStatus: 'active',
          status: 'breached',
          data: { severity: 'warning' },
          timestamp: relativeTime(30),
        }),
      ]);

      const unmatched = await expectStableCount(apiServices, 1, {
        ruleId: 'rule-matcher',
        actionTypes: ['unmatched'],
      });

      expect(unmatched[0]).toMatchObject({
        rule_id: 'rule-matcher',
        action_type: 'unmatched',
      });

      // No fire / suppress leaked through.
      const otherActions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId: 'rule-matcher',
        actionTypes: ['fire', 'suppress'],
      });

      expect(otherActions).toHaveLength(0);
    }
  );
});
