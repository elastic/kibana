/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID,
  KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX,
  buildFieldsZodValidator,
} from '@kbn/workflows';
import objectHash from 'object-hash';
import { buildAlertDetailsUrl } from '../dispatcher/alert_details_url';
import {
  MOCK_KIBANA_BASE_URL,
  createActionPolicy,
  createDispatcherPipelineState,
  createStepLogger,
} from '../dispatcher/fixtures/test_utils';
import { PolicyMatcher } from '../dispatcher/state';
import { BuildGroupsStep } from '../dispatcher/steps/build_groups_step';
import { EvaluateMatchersStep } from '../dispatcher/steps/evaluate_matchers_step';
import type { ActionPolicy } from '../dispatcher/types';
import {
  DEFAULT_AGGREGATED_ALERT_COUNT,
  TEST_ID_PREFIX,
  createSyntheticScenario,
} from './synthetic_alert_factory';
import { buildTestScenario, type TestScenarioGroup } from './test_scenario_builder';

const NOW = new Date('2026-10-29T10:00:00.000Z');
const SEED = 42;

const buildParams = (policy: ActionPolicy, seed = SEED) => ({
  policy,
  kibanaBaseUrl: MOCK_KIBANA_BASE_URL,
  seed,
  now: NOW,
});

const buildGroups = (policy: ActionPolicy, seed = SEED): TestScenarioGroup[] => {
  const scenario = buildTestScenario(buildParams(policy, seed));
  if (scenario.status !== 'ok') {
    throw new Error(`expected a scenario, got ${scenario.status}`);
  }
  return scenario.groups;
};

/** Groups the synthetic alerts the way the dispatcher pipeline does: match, then group. */
const groupWithDispatcher = async (policy: ActionPolicy, seed = SEED) => {
  const { alerts, rules } = createSyntheticScenario(buildParams(policy, seed));
  const logger = createStepLogger();
  const state = createDispatcherPipelineState({
    dispatchable: alerts,
    rules: new Map(rules.map((rule) => [rule.id, rule])),
    policies: new Map([[policy.id, policy]]),
  });

  const matched = await new EvaluateMatchersStep().execute(state, logger);
  if (matched.type !== 'continue') throw new Error('expected matchers to continue');
  const grouped = await new BuildGroupsStep().execute({ ...state, ...matched.data }, logger);
  if (grouped.type !== 'continue') throw new Error('expected grouping to continue');

  return { alerts, groups: grouped.data?.groups ?? [] };
};

const payloadValidator = buildFieldsZodValidator({
  properties: {
    payload: {
      $ref: `${KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX}${ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID}`,
    },
  },
  required: ['payload'],
});

const POLICIES: Array<[string, ActionPolicy]> = [
  ['per_alert, catch-all', createActionPolicy({ grouping: { mode: 'per_alert' } })],
  [
    'per_alert, tags only',
    createActionPolicy({ grouping: { mode: 'per_alert' }, matcher: { tags: ['prod', 'web'] } }),
  ],
  ['all, catch-all', createActionPolicy({ grouping: { mode: 'all' } })],
  [
    'all, tags only',
    createActionPolicy({ grouping: { mode: 'all' }, matcher: { tags: ['prod'] } }),
  ],
  [
    'per_field, catch-all',
    createActionPolicy({ grouping: { mode: 'per_field', fields: ['data.host.name'] } }),
  ],
  [
    'per_field, tags only',
    createActionPolicy({
      grouping: { mode: 'per_field', fields: ['data.host.name', 'data.env'] },
      matcher: { tags: ['prod'] },
    }),
  ],
];

describe('buildTestScenario', () => {
  describe.each(POLICIES)('%s', (_, policy) => {
    it('matches the groups the dispatcher builds for the same alerts', async () => {
      const groups = buildGroups(policy);
      const { groups: dispatcherGroups } = await groupWithDispatcher(policy);

      expect(groups).toHaveLength(1);
      expect(groups.map(({ id, groupKey }) => ({ id, groupKey }))).toEqual(
        dispatcherGroups.map(({ id, groupKey }) => ({ id, groupKey }))
      );
      expect(groups[0].payload).toEqual({
        id: dispatcherGroups[0].id,
        policyId: dispatcherGroups[0].policyId,
        groupKey: dispatcherGroups[0].groupKey,
        alerts: dispatcherGroups[0].alerts,
        rules: dispatcherGroups[0].rules,
      });
      expect(groups[0].id).toBe(objectHash({ policyId: policy.id, groupKey: groups[0].groupKey }));
    });

    it('builds a payload valid against the alertingV2NotificationGroup input definition', () => {
      const [{ payload }] = buildGroups(policy);

      expect(payloadValidator.safeParse({ payload }).success).toBe(true);
      expect(
        payloadValidator.safeParse({ payload: { ...payload, alerts: [{ alert_id: 1 }] } }).success
      ).toBe(false);
    });

    it('is deterministic for a seed', () => {
      expect(buildGroups(policy, 7)).toEqual(buildGroups(policy, 7));
      expect(buildGroups(policy, 7)[0].payload.alerts[0].alert_id).not.toEqual(
        buildGroups(policy, 8)[0].payload.alerts[0].alert_id
      );
    });
  });

  it('builds a per_alert group with one alert and a { groupHash, alertId } key', () => {
    const [{ groupKey, payload }] = buildGroups(
      createActionPolicy({ grouping: { mode: 'per_alert' } })
    );

    expect(payload.alerts).toHaveLength(1);
    expect(Object.keys(payload.rules)).toHaveLength(1);
    expect(groupKey).toEqual({
      groupHash: payload.alerts[0].group_hash,
      alertId: payload.alerts[0].alert_id,
    });
  });

  it('builds an all group with an empty key and alerts spread across placeholder rules', () => {
    const [{ groupKey, payload }] = buildGroups(createActionPolicy({ grouping: { mode: 'all' } }));

    expect(groupKey).toEqual({});
    expect(payload.alerts).toHaveLength(DEFAULT_AGGREGATED_ALERT_COUNT);
    expect(Object.keys(payload.rules)).toHaveLength(DEFAULT_AGGREGATED_ALERT_COUNT);
  });

  it('keys a per_field group by the placeholder data values, and a missing field by null', () => {
    const [{ groupKey, payload }] = buildGroups(
      createActionPolicy({
        grouping: { mode: 'per_field', fields: ['data.host.name', 'labels.missing'] },
      })
    );

    expect(groupKey).toEqual({
      'data.host.name': expect.stringMatching(/^test-host\.name-[0-9a-f]{8}$/),
      'labels.missing': null,
    });
    expect(payload.alerts).toHaveLength(DEFAULT_AGGREGATED_ALERT_COUNT);
    for (const alert of payload.alerts) {
      expect(alert.data).toEqual({ host: { name: groupKey['data.host.name'] } });
    }
  });

  it('keys a per_field group by alert attributes the synthetic alerts share', () => {
    const [{ groupKey, payload }] = buildGroups(
      createActionPolicy({ grouping: { mode: 'per_field', fields: ['severity', 'alert_status'] } })
    );

    expect(groupKey).toEqual({ severity: payload.alerts[0].severity, alert_status: 'active' });
    expect(payload.alerts.every(({ data }) => data === undefined)).toBe(true);
  });

  it('does not support a policy whose matcher has a KQL expression', () => {
    expect(
      buildTestScenario(
        buildParams(
          createActionPolicy({ matcher: { tags: ['prod'], expression: 'severity: critical' } })
        )
      )
    ).toEqual({ status: 'unsupported', reason: 'matcher_expression' });
  });

  it('supports a policy whose matcher expression is blank', () => {
    expect(
      buildTestScenario(buildParams(createActionPolicy({ matcher: { expression: '   ' } }))).status
    ).toBe('ok');
  });
});

describe('createSyntheticScenario', () => {
  it('builds placeholder rules that carry the policy routing tags', () => {
    const policy = createActionPolicy({
      grouping: { mode: 'all' },
      matcher: { tags: ['prod', 'web'] },
    });
    const { rules } = createSyntheticScenario(buildParams(policy));

    expect(rules).toHaveLength(DEFAULT_AGGREGATED_ALERT_COUNT);
    rules.forEach((rule, index) => {
      expect(rule).toEqual({
        id: expect.stringMatching(/^test-rule-/),
        spaceId: 'default',
        name: `Test rule ${index + 1}`,
        routingTags: ['prod', 'web'],
      });
      expect(PolicyMatcher.of(policy.matcher).matchesRoutingTags(rule.routingTags)).toBe(true);
    });
  });

  it('builds synthetic alerts in the policy space with production-shaped alert urls', () => {
    const policy = createActionPolicy({ spaceId: 'team-a' });
    const {
      alerts: [alert],
      rules: [rule],
    } = createSyntheticScenario(buildParams(policy));

    expect(alert).toEqual({
      last_event_timestamp: NOW.toISOString(),
      rule_id: rule.id,
      source: 'internal',
      space_id: 'team-a',
      group_hash: expect.stringMatching(/^test-group-hash-/),
      alert_id: expect.stringMatching(/^test-alert-/),
      alert_status: 'active',
      severity: expect.any(String),
      alert_url: buildAlertDetailsUrl({
        baseUrl: MOCK_KIBANA_BASE_URL,
        spaceId: 'team-a',
        alertId: alert.alert_id,
      }),
    });
    expect(alert.alert_id.startsWith(TEST_ID_PREFIX)).toBe(true);
  });

  it('gives every alert a distinct id and group hash', () => {
    const { alerts } = createSyntheticScenario(
      buildParams(createActionPolicy({ grouping: { mode: 'all' } }))
    );

    expect(new Set(alerts.map(({ alert_id: alertId }) => alertId)).size).toBe(alerts.length);
    expect(new Set(alerts.map(({ group_hash: groupHash }) => groupHash)).size).toBe(alerts.length);
  });
});
