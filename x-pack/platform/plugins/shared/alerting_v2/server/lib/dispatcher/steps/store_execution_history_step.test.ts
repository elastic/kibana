/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { eventLoggerMock } from '@kbn/event-log-plugin/server/mocks';
import { ACTION_POLICY_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { createEventLogService } from '../../services/event_log_service/event_log_service.mock';
import {
  createActionGroup,
  createActionPolicy,
  createAlertEpisode,
  createDispatchFailure,
  createDispatcherPipelineInput,
  createDispatcherPipelineState,
  createRule,
} from '../fixtures/test_utils';
import type { ActionPolicy, ActionPolicyId, DispatchFailure, Rule, RuleId } from '../types';
import { StoreExecutionHistoryStep } from './store_execution_history_step';
import { DISPATCH_FAILURE_REASONS } from './constants';

describe('StoreExecutionHistoryStep', () => {
  let eventLogger: ReturnType<typeof eventLoggerMock.create>;
  let step: StoreExecutionHistoryStep;

  beforeEach(() => {
    const { eventLogService, mockEventLogger } = createEventLogService();
    eventLogger = mockEventLogger;
    step = new StoreExecutionHistoryStep(eventLogService);
  });

  it('emits one dispatched summary per policy with aggregated episode/rule/group counts', async () => {
    const ruleA = createRule({ id: 'rule-a', spaceId: 'default' });
    const ruleB = createRule({ id: 'rule-b', spaceId: 'default' });
    const policy = createActionPolicy({ id: 'policy-1', spaceId: 'default' });
    const episodes = [
      createAlertEpisode({ rule_id: 'rule-a', episode_id: 'ep-1' }),
      createAlertEpisode({ rule_id: 'rule-a', episode_id: 'ep-2' }),
      createAlertEpisode({ rule_id: 'rule-b', episode_id: 'ep-3' }),
    ];
    const group1 = createActionGroup({
      id: 'group-1',
      policyId: 'policy-1',
      spaceId: 'default',
      episodes: [episodes[0], episodes[1]],
      destinations: [{ type: 'workflow', id: 'wf-a' }],
    });
    const group2 = createActionGroup({
      id: 'group-2',
      policyId: 'policy-1',
      spaceId: 'default',
      episodes: [episodes[2]],
      destinations: [{ type: 'workflow', id: 'wf-b' }],
    });

    await step.execute(
      createDispatcherPipelineState({
        dispatch: [group1, group2],
        dispatchable: episodes,
        rules: new Map<RuleId, Rule>([
          [ruleA.id, ruleA],
          [ruleB.id, ruleB],
        ]),
        policies: new Map<ActionPolicyId, ActionPolicy>([[policy.id, policy]]),
        dispatchedExecutions: new Map([
          ['group-1', ['exec-a']],
          ['group-2', ['exec-b']],
        ]),
      })
    );

    expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
    const [[event]] = eventLogger.logEvent.mock.calls;
    expect(event?.event?.action).toBe('dispatched');
    expect(event?.event?.outcome).toBe('success');
    expect(event?.kibana?.saved_objects).toEqual([
      {
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        id: 'policy-1',
        rel: 'primary',
        namespace: undefined,
      },
      {
        type: RULE_SAVED_OBJECT_TYPE,
        type_id: 'alert',
        id: 'rule-a',
        rel: 'primary',
        namespace: undefined,
      },
      {
        type: RULE_SAVED_OBJECT_TYPE,
        type_id: 'alert',
        id: 'rule-b',
        rel: 'primary',
        namespace: undefined,
      },
    ]);
    expect(event?.kibana?.alerting_v2?.dispatcher).toEqual({
      episode_count: 3,
      episode_ids: ['ep-1', 'ep-2', 'ep-3'],
      rule_count: 2,
      action_group_count: 2,
      action_group_ids: ['group-1', 'group-2'],
      workflow_ids: ['wf-a', 'wf-b'],
      workflow_execution_ids: ['exec-a', 'exec-b'],
      execution: { uuid: '00000000-0000-4000-8000-000000000000' },
    });
  });

  it('emits separate summaries per policy when multiple policies dispatched in one run', async () => {
    const rule = createRule({ id: 'rule-1' });
    const policyA = createActionPolicy({ id: 'policy-a' });
    const policyB = createActionPolicy({ id: 'policy-b' });
    const episode = createAlertEpisode({ rule_id: 'rule-1', episode_id: 'ep-1' });
    const groupA = createActionGroup({ id: 'g-a', policyId: 'policy-a', episodes: [episode] });
    const groupB = createActionGroup({ id: 'g-b', policyId: 'policy-b', episodes: [episode] });

    await step.execute(
      createDispatcherPipelineState({
        dispatch: [groupA, groupB],
        dispatchable: [episode],
        rules: new Map<RuleId, Rule>([[rule.id, rule]]),
        policies: new Map<ActionPolicyId, ActionPolicy>([
          [policyA.id, policyA],
          [policyB.id, policyB],
        ]),
      })
    );

    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    const policyIds = eventLogger.logEvent.mock.calls.map(
      ([event]) => event?.kibana?.saved_objects?.[0]?.id
    );
    expect(new Set(policyIds)).toEqual(new Set(['policy-a', 'policy-b']));
  });

  it('emits a throttled summary with the same shape as dispatched', async () => {
    const rule = createRule({ id: 'rule-1' });
    const policy = createActionPolicy({ id: 'policy-1' });
    const episode = createAlertEpisode({ rule_id: 'rule-1', episode_id: 'ep-1' });
    const group = createActionGroup({
      id: 'group-1',
      policyId: 'policy-1',
      episodes: [episode],
      destinations: [{ type: 'workflow', id: 'wf-a' }],
    });

    await step.execute(
      createDispatcherPipelineState({
        throttled: [group],
        dispatchable: [episode],
        rules: new Map<RuleId, Rule>([[rule.id, rule]]),
        policies: new Map<ActionPolicyId, ActionPolicy>([[policy.id, policy]]),
      })
    );

    expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
    const [[event]] = eventLogger.logEvent.mock.calls;
    expect(event?.event?.action).toBe('throttled');
    expect(event?.event?.outcome).toBe('success');
    expect(event?.kibana?.alerting_v2?.dispatcher).toEqual({
      episode_count: 1,
      episode_ids: ['ep-1'],
      rule_count: 1,
      action_group_count: 1,
      action_group_ids: ['group-1'],
      workflow_ids: ['wf-a'],
      workflow_execution_ids: [],
      execution: { uuid: '00000000-0000-4000-8000-000000000000' },
    });
  });

  it('emits one unmatched summary per rule with episode_ids for that rule', async () => {
    const ruleA = createRule({ id: 'rule-a' });
    const ruleB = createRule({ id: 'rule-b' });
    const unmatchedA1 = createAlertEpisode({ rule_id: 'rule-a', episode_id: 'ep-a1' });
    const unmatchedA2 = createAlertEpisode({ rule_id: 'rule-a', episode_id: 'ep-a2' });
    const unmatchedB1 = createAlertEpisode({ rule_id: 'rule-b', episode_id: 'ep-b1' });

    await step.execute(
      createDispatcherPipelineState({
        dispatchable: [unmatchedA1, unmatchedA2, unmatchedB1],
        rules: new Map<RuleId, Rule>([
          [ruleA.id, ruleA],
          [ruleB.id, ruleB],
        ]),
      })
    );

    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    const events = eventLogger.logEvent.mock.calls.map(([event]) => event);
    const byRuleId = new Map(events.map((event) => [event?.kibana?.saved_objects?.[0]?.id, event]));

    const eventA = byRuleId.get('rule-a');
    expect(eventA?.event?.action).toBe('unmatched');
    expect(eventA?.event?.outcome).toBe('success');
    expect(eventA?.kibana?.saved_objects).toEqual([
      {
        type: RULE_SAVED_OBJECT_TYPE,
        type_id: 'alert',
        id: 'rule-a',
        rel: 'primary',
        namespace: undefined,
      },
    ]);
    expect(eventA?.kibana?.alerting_v2?.dispatcher).toEqual({
      episode_count: 2,
      episode_ids: ['ep-a1', 'ep-a2'],
      execution: { uuid: '00000000-0000-4000-8000-000000000000' },
    });

    const eventB = byRuleId.get('rule-b');
    expect(eventB?.kibana?.alerting_v2?.dispatcher).toEqual({
      episode_count: 1,
      episode_ids: ['ep-b1'],
      execution: { uuid: '00000000-0000-4000-8000-000000000000' },
    });
    expect(eventB?.kibana?.saved_objects?.[0]?.type_id).toBe('alert');
  });

  it('excludes episodes handled by dispatch or throttled from the unmatched set', async () => {
    const rule = createRule({ id: 'rule-1' });
    const policy = createActionPolicy({ id: 'policy-1' });
    const dispatched = createAlertEpisode({ rule_id: 'rule-1', episode_id: 'ep-dispatched' });
    const throttledEp = createAlertEpisode({ rule_id: 'rule-1', episode_id: 'ep-throttled' });
    const unmatchedEp = createAlertEpisode({ rule_id: 'rule-1', episode_id: 'ep-unmatched' });

    await step.execute(
      createDispatcherPipelineState({
        dispatch: [createActionGroup({ id: 'g1', policyId: 'policy-1', episodes: [dispatched] })],
        throttled: [createActionGroup({ id: 'g2', policyId: 'policy-1', episodes: [throttledEp] })],
        dispatchable: [dispatched, throttledEp, unmatchedEp],
        rules: new Map<RuleId, Rule>([[rule.id, rule]]),
        policies: new Map<ActionPolicyId, ActionPolicy>([[policy.id, policy]]),
      })
    );

    expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
    const actions = eventLogger.logEvent.mock.calls.map(([event]) => event?.event?.action);
    expect(actions).toEqual(['dispatched', 'throttled', 'unmatched']);
    const outcomes = eventLogger.logEvent.mock.calls.map(([event]) => event?.event?.outcome);
    expect(outcomes).toEqual(['success', 'success', 'success']);
    const unmatchedEvent = eventLogger.logEvent.mock.calls[2][0];
    expect(unmatchedEvent?.kibana?.alerting_v2?.dispatcher?.episode_ids).toEqual(['ep-unmatched']);
  });

  it('stamps the same execution.uuid on every event emitted in a single run', async () => {
    const rule = createRule({ id: 'rule-1' });
    const policy = createActionPolicy({ id: 'policy-1' });
    const dispatched = createAlertEpisode({ rule_id: 'rule-1', episode_id: 'ep-dispatched' });
    const throttledEp = createAlertEpisode({ rule_id: 'rule-1', episode_id: 'ep-throttled' });
    const unmatchedEp = createAlertEpisode({ rule_id: 'rule-1', episode_id: 'ep-unmatched' });
    const executionUuid = 'a1b2c3d4-e5f6-4789-9abc-def012345678';

    await step.execute(
      createDispatcherPipelineState({
        input: createDispatcherPipelineInput({ executionUuid }),
        dispatch: [createActionGroup({ id: 'g1', policyId: 'policy-1', episodes: [dispatched] })],
        throttled: [createActionGroup({ id: 'g2', policyId: 'policy-1', episodes: [throttledEp] })],
        dispatchable: [dispatched, throttledEp, unmatchedEp],
        rules: new Map<RuleId, Rule>([[rule.id, rule]]),
        policies: new Map<ActionPolicyId, ActionPolicy>([[policy.id, policy]]),
      })
    );

    expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
    const uuids = eventLogger.logEvent.mock.calls.map(
      ([event]) => event?.kibana?.alerting_v2?.dispatcher?.execution?.uuid
    );
    expect(uuids).toEqual([executionUuid, executionUuid, executionUuid]);
  });

  it('short-circuits when there is nothing to record', async () => {
    const result = await step.execute(createDispatcherPipelineState({}));

    expect(result).toEqual({ type: 'continue' });
    expect(eventLogger.logEvent).not.toHaveBeenCalled();
  });

  it('does not emit dispatch_failed events when all dispatches succeed', async () => {
    const rule = createRule({ id: 'rule-1' });
    const policy = createActionPolicy({ id: 'policy-1' });
    const episode = createAlertEpisode({ rule_id: 'rule-1', episode_id: 'ep-1' });
    const group = createActionGroup({
      id: 'group-1',
      policyId: 'policy-1',
      episodes: [episode],
      destinations: [{ type: 'workflow', id: 'wf-a' }],
    });

    await step.execute(
      createDispatcherPipelineState({
        dispatch: [group],
        dispatchable: [episode],
        rules: new Map<RuleId, Rule>([[rule.id, rule]]),
        policies: new Map<ActionPolicyId, ActionPolicy>([[policy.id, policy]]),
        dispatchedExecutions: new Map([['group-1', ['exec-a']]]),
      })
    );

    const actions = eventLogger.logEvent.mock.calls.map(([event]) => event?.event?.action);
    expect(actions).not.toContain('dispatch_failed');
  });

  it('emits a dispatch_failed event for a failed action-group → workflow attempt', async () => {
    const ruleA = createRule({ id: 'rule-a', spaceId: 'default' });
    const ruleB = createRule({ id: 'rule-b', spaceId: 'default' });
    const failure: DispatchFailure = {
      policyId: 'policy-1',
      spaceId: 'default',
      actionGroupId: 'group-1',
      workflowId: 'wf-a',
      episodes: [
        createAlertEpisode({ rule_id: 'rule-a', episode_id: 'ep-1' }),
        createAlertEpisode({ rule_id: 'rule-b', episode_id: 'ep-2' }),
      ],
      reason: DISPATCH_FAILURE_REASONS.WORKFLOW_DISABLED,
      message: 'Workflow wf-a is disabled, enable it to dispatch for group group-1',
    };

    await step.execute(
      createDispatcherPipelineState({
        dispatchFailures: [failure],
        rules: new Map<RuleId, Rule>([
          [ruleA.id, ruleA],
          [ruleB.id, ruleB],
        ]),
      })
    );

    expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
    const [[event]] = eventLogger.logEvent.mock.calls;
    expect(event?.event?.action).toBe('dispatch_failed');
    expect(event?.event?.outcome).toBe('failure');
    expect(event?.error?.message).toBe(
      'Workflow wf-a is disabled, enable it to dispatch for group group-1'
    );
    expect(event?.kibana?.saved_objects).toEqual([
      {
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        id: 'policy-1',
        rel: 'primary',
        namespace: undefined,
      },
      {
        type: RULE_SAVED_OBJECT_TYPE,
        type_id: 'alert',
        id: 'rule-a',
        rel: 'primary',
        namespace: undefined,
      },
      {
        type: RULE_SAVED_OBJECT_TYPE,
        type_id: 'alert',
        id: 'rule-b',
        rel: 'primary',
        namespace: undefined,
      },
    ]);
    expect(event?.kibana?.alerting_v2?.dispatcher).toEqual({
      failure_reason: 'workflow_disabled',
      action_group_count: 1,
      action_group_ids: ['group-1'],
      workflow_ids: ['wf-a'],
      episode_count: 2,
      episode_ids: ['ep-1', 'ep-2'],
      rule_count: 2,
      execution: { uuid: '00000000-0000-4000-8000-000000000000' },
    });
  });

  it('emits dispatch_failed events even when nothing else was recorded', async () => {
    const failure: DispatchFailure = {
      policyId: 'policy-1',
      spaceId: 'default',
      actionGroupId: 'group-1',
      workflowId: 'wf-a',
      episodes: [createAlertEpisode({ rule_id: 'rule-1', episode_id: 'ep-1' })],
      reason: DISPATCH_FAILURE_REASONS.SCHEDULE_ERROR,
      message: 'boom',
    };

    await step.execute(createDispatcherPipelineState({ dispatchFailures: [failure] }));

    expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls[0][0]?.event?.action).toBe('dispatch_failed');
  });

  it('sets namespace and space_ids on dispatch_failed events for non-default spaces', async () => {
    const rule = createRule({ id: 'rule-1', spaceId: 'my-space' });
    const failure: DispatchFailure = {
      policyId: 'policy-1',
      spaceId: 'my-space',
      actionGroupId: 'group-1',
      workflowId: 'wf-a',
      episodes: [createAlertEpisode({ rule_id: 'rule-1', episode_id: 'ep-1' })],
      reason: DISPATCH_FAILURE_REASONS.WORKFLOW_NOT_FOUND,
      message: 'not found',
    };

    await step.execute(
      createDispatcherPipelineState({
        dispatchFailures: [failure],
        rules: new Map<RuleId, Rule>([[rule.id, rule]]),
      })
    );

    const [[event]] = eventLogger.logEvent.mock.calls;
    expect(event?.kibana?.space_ids).toEqual(['my-space']);
    expect(event?.kibana?.saved_objects?.[0]?.namespace).toBe('my-space');
    expect(event?.kibana?.saved_objects?.[1]?.namespace).toBe('my-space');
  });

  it('spills failure rule ids beyond the SO-ref cap into dispatcher.rule_ids', async () => {
    const ruleIds = Array.from({ length: 55 }, (_, i) => `rule-${i}`);
    const rules = new Map<RuleId, Rule>(
      ruleIds.map((id) => [id, createRule({ id, spaceId: 'default' })])
    );
    const failure: DispatchFailure = {
      policyId: 'policy-1',
      spaceId: 'default',
      actionGroupId: 'group-1',
      workflowId: 'wf-a',
      episodes: ruleIds.map((rule_id, i) => createAlertEpisode({ rule_id, episode_id: `ep-${i}` })),
      reason: DISPATCH_FAILURE_REASONS.SCHEDULE_ERROR,
      message: 'boom',
    };

    await step.execute(createDispatcherPipelineState({ dispatchFailures: [failure], rules }));

    const [[event]] = eventLogger.logEvent.mock.calls;
    const refs = event?.kibana?.saved_objects ?? [];
    const ruleRefs = refs.filter((ref) => ref?.type === RULE_SAVED_OBJECT_TYPE);
    expect(ruleRefs).toHaveLength(50);
    expect(event?.kibana?.alerting_v2?.dispatcher?.rule_count).toBe(55);
    expect(event?.kibana?.alerting_v2?.dispatcher?.rule_ids).toHaveLength(5);
  });

  it('sets namespace and space_ids for non-default spaces', async () => {
    const rule = createRule({ id: 'rule-1', spaceId: 'my-space' });
    const policy = createActionPolicy({ id: 'policy-1', spaceId: 'my-space' });
    const episode = createAlertEpisode({ rule_id: 'rule-1' });
    const group = createActionGroup({
      policyId: 'policy-1',
      spaceId: 'my-space',
      episodes: [episode],
    });

    await step.execute(
      createDispatcherPipelineState({
        dispatch: [group],
        dispatchable: [episode],
        rules: new Map<RuleId, Rule>([[rule.id, rule]]),
        policies: new Map<ActionPolicyId, ActionPolicy>([[policy.id, policy]]),
      })
    );

    const [[event]] = eventLogger.logEvent.mock.calls;
    expect(event?.kibana?.space_ids).toEqual(['my-space']);
    expect(event?.kibana?.saved_objects?.[0]?.namespace).toBe('my-space');
    expect(event?.kibana?.saved_objects?.[1]?.namespace).toBe('my-space');
  });

  it('deduplicates workflow_ids across an active policy multiple action groups', async () => {
    const rule = createRule({ id: 'rule-1' });
    const policy = createActionPolicy({ id: 'policy-1' });
    const episode = createAlertEpisode({ rule_id: 'rule-1' });
    const group1 = createActionGroup({
      id: 'g1',
      policyId: 'policy-1',
      episodes: [episode],
      destinations: [
        { type: 'workflow', id: 'wf-a' },
        { type: 'workflow', id: 'wf-b' },
      ],
    });
    const group2 = createActionGroup({
      id: 'g2',
      policyId: 'policy-1',
      episodes: [episode],
      destinations: [
        { type: 'workflow', id: 'wf-a' },
        { type: 'workflow', id: 'wf-c' },
      ],
    });

    await step.execute(
      createDispatcherPipelineState({
        dispatch: [group1, group2],
        dispatchable: [episode],
        rules: new Map<RuleId, Rule>([[rule.id, rule]]),
        policies: new Map<ActionPolicyId, ActionPolicy>([[policy.id, policy]]),
      })
    );

    const [[event]] = eventLogger.logEvent.mock.calls;
    expect(event?.kibana?.alerting_v2?.dispatcher?.workflow_ids).toEqual(['wf-a', 'wf-b', 'wf-c']);
  });

  it('stamps @timestamp from pipeline input.startedAt', async () => {
    const rule = createRule({ id: 'rule-1' });
    const episode = createAlertEpisode({ rule_id: 'rule-1' });

    await step.execute(
      createDispatcherPipelineState({
        input: createDispatcherPipelineInput({
          startedAt: new Date('2027-06-01T12:34:56.789Z'),
          previousStartedAt: new Date('2027-06-01T12:00:00.000Z'),
        }),
        dispatchable: [episode],
        rules: new Map<RuleId, Rule>([[rule.id, rule]]),
      })
    );

    const [[event]] = eventLogger.logEvent.mock.calls;
    expect(event?.['@timestamp']).toBe('2027-06-01T12:34:56.789Z');
  });

  it('spills rule ids beyond the SO-ref cap into kibana.alerting_v2.dispatcher.rule_ids', async () => {
    const policy = createActionPolicy({ id: 'policy-1' });
    const ruleIds = Array.from({ length: 55 }, (_, i) => `rule-${i}`);
    const rules = new Map<RuleId, Rule>(
      ruleIds.map((id) => [id, createRule({ id, spaceId: 'default' })])
    );
    const episodes = ruleIds.map((rule_id, i) =>
      createAlertEpisode({ rule_id, episode_id: `ep-${i}` })
    );
    const group = createActionGroup({
      id: 'big-group',
      policyId: 'policy-1',
      episodes,
    });

    await step.execute(
      createDispatcherPipelineState({
        dispatch: [group],
        dispatchable: episodes,
        rules,
        policies: new Map<ActionPolicyId, ActionPolicy>([[policy.id, policy]]),
      })
    );

    const [[event]] = eventLogger.logEvent.mock.calls;
    const refs = event?.kibana?.saved_objects ?? [];
    const ruleRefs = refs.filter((ref) => ref?.type === RULE_SAVED_OBJECT_TYPE);
    expect(ruleRefs).toHaveLength(50);
    expect(event?.kibana?.alerting_v2?.dispatcher?.rule_count).toBe(55);
    expect(event?.kibana?.alerting_v2?.dispatcher?.rule_ids).toHaveLength(5);
    expect(event?.kibana?.alerting_v2?.dispatcher?.rule_ids).toEqual(
      expect.arrayContaining(['rule-50', 'rule-51', 'rule-52', 'rule-53', 'rule-54'])
    );
  });

  it('does not set rule_ids when rule count fits within the SO-ref cap', async () => {
    const rule = createRule({ id: 'rule-1' });
    const policy = createActionPolicy({ id: 'policy-1' });
    const episode = createAlertEpisode({ rule_id: 'rule-1' });
    const group = createActionGroup({
      id: 'g1',
      policyId: 'policy-1',
      episodes: [episode],
    });

    await step.execute(
      createDispatcherPipelineState({
        dispatch: [group],
        dispatchable: [episode],
        rules: new Map<RuleId, Rule>([[rule.id, rule]]),
        policies: new Map<ActionPolicyId, ActionPolicy>([[policy.id, policy]]),
      })
    );

    const [[event]] = eventLogger.logEvent.mock.calls;
    expect(event?.kibana?.alerting_v2?.dispatcher?.rule_ids).toBeUndefined();
  });

  describe('partial and total dispatch failures', () => {
    it('partial group failure: excludes the failed workflow from the dispatched summary', async () => {
      const rule = createRule({ id: 'rule-1' });
      const policy = createActionPolicy({ id: 'policy-1' });
      const episode = createAlertEpisode({ rule_id: 'rule-1', episode_id: 'ep-1' });
      const group = createActionGroup({
        id: 'g1',
        policyId: 'policy-1',
        episodes: [episode],
        destinations: [
          { type: 'workflow', id: 'wf-a' },
          { type: 'workflow', id: 'wf-b' },
        ],
      });
      const failure = createDispatchFailure({
        policyId: 'policy-1',
        actionGroupId: 'g1',
        workflowId: 'wf-b',
        episodes: [episode],
        reason: DISPATCH_FAILURE_REASONS.WORKFLOW_DISABLED,
        message: 'Workflow wf-b is disabled',
      });

      await step.execute(
        createDispatcherPipelineState({
          dispatch: [group],
          dispatchable: [episode],
          dispatchedExecutions: new Map([['g1', ['exec-a']]]),
          dispatchFailures: [failure],
          rules: new Map<RuleId, Rule>([[rule.id, rule]]),
          policies: new Map<ActionPolicyId, ActionPolicy>([[policy.id, policy]]),
        })
      );

      expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
      const calls = eventLogger.logEvent.mock.calls;
      const dispatched = calls.find(([event]) => event?.event?.action === 'dispatched')?.[0];
      const failed = calls.find(([event]) => event?.event?.action === 'dispatch_failed')?.[0];

      expect(dispatched?.kibana?.alerting_v2?.dispatcher).toMatchObject({
        action_group_ids: ['g1'],
        workflow_ids: ['wf-a'],
        workflow_execution_ids: ['exec-a'],
        episode_ids: ['ep-1'],
      });
      expect(failed?.kibana?.alerting_v2?.dispatcher?.workflow_ids).toEqual(['wf-b']);
    });

    it('total group failure: emits no dispatched event and no unmatched event', async () => {
      const rule = createRule({ id: 'rule-1' });
      const episode = createAlertEpisode({ rule_id: 'rule-1', episode_id: 'ep-1' });
      const group = createActionGroup({
        id: 'g1',
        policyId: 'policy-1',
        episodes: [episode],
        destinations: [
          { type: 'workflow', id: 'wf-a' },
          { type: 'workflow', id: 'wf-b' },
        ],
      });
      const failures = [
        createDispatchFailure({ actionGroupId: 'g1', workflowId: 'wf-a', episodes: [episode] }),
        createDispatchFailure({ actionGroupId: 'g1', workflowId: 'wf-b', episodes: [episode] }),
      ];

      await step.execute(
        createDispatcherPipelineState({
          dispatch: [group],
          dispatchable: [episode],
          dispatchFailures: failures,
          rules: new Map<RuleId, Rule>([[rule.id, rule]]),
        })
      );

      const actions = eventLogger.logEvent.mock.calls.map(([event]) => event?.event?.action);
      expect(actions).not.toContain('dispatched');
      expect(actions).not.toContain('unmatched');
      expect(actions.filter((a) => a === 'dispatch_failed')).toHaveLength(2);
    });

    it('same workflow in two groups: success for g1 is not suppressed by g2 failure', async () => {
      const rule = createRule({ id: 'rule-1' });
      const policy = createActionPolicy({ id: 'policy-1' });
      const ep1 = createAlertEpisode({ rule_id: 'rule-1', episode_id: 'ep-1' });
      const ep2 = createAlertEpisode({ rule_id: 'rule-1', episode_id: 'ep-2' });
      const group1 = createActionGroup({
        id: 'g1',
        policyId: 'policy-1',
        episodes: [ep1],
        destinations: [{ type: 'workflow', id: 'wf-a' }],
      });
      const group2 = createActionGroup({
        id: 'g2',
        policyId: 'policy-1',
        episodes: [ep2],
        destinations: [{ type: 'workflow', id: 'wf-a' }],
      });
      const failure = createDispatchFailure({
        policyId: 'policy-1',
        actionGroupId: 'g2',
        workflowId: 'wf-a',
        episodes: [ep2],
        reason: DISPATCH_FAILURE_REASONS.WORKFLOW_NOT_FOUND,
        message: 'Workflow wf-a not found',
      });

      await step.execute(
        createDispatcherPipelineState({
          dispatch: [group1, group2],
          dispatchable: [ep1, ep2],
          dispatchedExecutions: new Map([['g1', ['exec-a']]]),
          dispatchFailures: [failure],
          rules: new Map<RuleId, Rule>([[rule.id, rule]]),
          policies: new Map<ActionPolicyId, ActionPolicy>([[policy.id, policy]]),
        })
      );

      const calls = eventLogger.logEvent.mock.calls;
      const dispatched = calls.find(([event]) => event?.event?.action === 'dispatched')?.[0];

      expect(dispatched?.kibana?.alerting_v2?.dispatcher).toMatchObject({
        action_group_ids: ['g1'],
        workflow_ids: ['wf-a'],
        workflow_execution_ids: ['exec-a'],
        episode_ids: ['ep-1'],
      });
    });

    it('mixed groups in one policy: fully-failed group episodes excluded from dispatched summary', async () => {
      const rule = createRule({ id: 'rule-1' });
      const policy = createActionPolicy({ id: 'policy-1' });
      const ep1 = createAlertEpisode({ rule_id: 'rule-1', episode_id: 'ep-1' });
      const ep2 = createAlertEpisode({ rule_id: 'rule-1', episode_id: 'ep-2' });
      const failedGroup = createActionGroup({
        id: 'g1',
        policyId: 'policy-1',
        episodes: [ep1],
        destinations: [{ type: 'workflow', id: 'wf-a' }],
      });
      const successGroup = createActionGroup({
        id: 'g2',
        policyId: 'policy-1',
        episodes: [ep2],
        destinations: [{ type: 'workflow', id: 'wf-b' }],
      });
      const failure = createDispatchFailure({
        policyId: 'policy-1',
        actionGroupId: 'g1',
        workflowId: 'wf-a',
        episodes: [ep1],
      });

      await step.execute(
        createDispatcherPipelineState({
          dispatch: [failedGroup, successGroup],
          dispatchable: [ep1, ep2],
          dispatchedExecutions: new Map([['g2', ['exec-b']]]),
          dispatchFailures: [failure],
          rules: new Map<RuleId, Rule>([[rule.id, rule]]),
          policies: new Map<ActionPolicyId, ActionPolicy>([[policy.id, policy]]),
        })
      );

      const calls = eventLogger.logEvent.mock.calls;
      const dispatched = calls.find(([event]) => event?.event?.action === 'dispatched')?.[0];

      // Only g2's contributions should appear in the dispatched event.
      expect(dispatched?.kibana?.alerting_v2?.dispatcher).toMatchObject({
        action_group_count: 1,
        action_group_ids: ['g2'],
        workflow_ids: ['wf-b'],
        episode_count: 1,
        episode_ids: ['ep-2'],
        rule_count: 1,
      });
    });

    it('throttled summary is not affected by dispatch failures referencing the same group id', async () => {
      const rule = createRule({ id: 'rule-1' });
      const policy = createActionPolicy({ id: 'policy-1' });
      const episode = createAlertEpisode({ rule_id: 'rule-1', episode_id: 'ep-1' });
      const throttledGroup = createActionGroup({
        id: 'g1',
        policyId: 'policy-1',
        episodes: [episode],
        destinations: [
          { type: 'workflow', id: 'wf-a' },
          { type: 'workflow', id: 'wf-b' },
        ],
      });
      // A failure referencing the same group id as the throttled group should
      // not affect the throttled summary — throttled groups are never dispatched.
      const failure = createDispatchFailure({
        policyId: 'policy-1',
        actionGroupId: 'g1',
        workflowId: 'wf-a',
        episodes: [episode],
      });

      await step.execute(
        createDispatcherPipelineState({
          throttled: [throttledGroup],
          dispatchable: [episode],
          dispatchFailures: [failure],
          rules: new Map<RuleId, Rule>([[rule.id, rule]]),
          policies: new Map<ActionPolicyId, ActionPolicy>([[policy.id, policy]]),
        })
      );

      const calls = eventLogger.logEvent.mock.calls;
      const throttled = calls.find(([event]) => event?.event?.action === 'throttled')?.[0];

      expect(throttled?.kibana?.alerting_v2?.dispatcher).toMatchObject({
        action_group_ids: ['g1'],
        workflow_ids: ['wf-a', 'wf-b'],
      });
    });
  });

  describe('external episode handling', () => {
    it('two external episodes from different vendors produce separate unmatched events', async () => {
      const pdEpisode = createAlertEpisode({
        source: 'pagerduty',
        rule_id: null,
        space_id: 'default',
        episode_id: 'pd-1',
      });
      const ddEpisode = createAlertEpisode({
        source: 'datadog',
        rule_id: null,
        space_id: 'default',
        episode_id: 'dd-1',
      });

      await step.execute(
        createDispatcherPipelineState({
          dispatchable: [pdEpisode, ddEpisode],
        })
      );

      expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
      const actions = eventLogger.logEvent.mock.calls.map(([event]) => event?.event?.action);
      expect(actions).toEqual(['unmatched', 'unmatched']);
      const episodeSets = eventLogger.logEvent.mock.calls.map(
        ([event]) => event?.kibana?.alerting_v2?.dispatcher?.episode_ids
      );
      expect(episodeSets).toContainEqual(['pd-1']);
      expect(episodeSets).toContainEqual(['dd-1']);
    });

    it('same vendor in two spaces produces separate unmatched events', async () => {
      const episodes = ['space-a', 'space-b'].map((spaceId) =>
        createAlertEpisode({
          source: 'pagerduty',
          rule_id: null,
          space_id: spaceId,
          episode_id: `pd-${spaceId}`,
        })
      );

      await step.execute(createDispatcherPipelineState({ dispatchable: episodes }));

      expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
      const spaces = eventLogger.logEvent.mock.calls.map(([event]) => event?.kibana?.space_ids);
      expect(spaces).toEqual([['space-a'], ['space-b']]);
    });

    it('external episode uses episode.space_id for the event space, not a rule space', async () => {
      const pdEpisode = createAlertEpisode({
        source: 'pagerduty',
        rule_id: null,
        space_id: 'my-space',
        episode_id: 'pd-1',
      });

      await step.execute(
        createDispatcherPipelineState({
          dispatchable: [pdEpisode],
        })
      );

      const [[event]] = eventLogger.logEvent.mock.calls;
      expect(event?.kibana?.space_ids).toEqual(['my-space']);
      expect(event?.kibana?.saved_objects).toEqual([]);
    });
  });
});
