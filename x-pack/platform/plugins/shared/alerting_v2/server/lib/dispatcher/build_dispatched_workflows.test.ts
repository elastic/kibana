/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createActionGroup,
  createActionPolicy,
  createAlert,
  createDispatcherPipelineState,
} from './fixtures/test_utils';
import { buildDispatchedWorkflows } from './build_dispatched_workflows';

describe('buildDispatchedWorkflows', () => {
  it('resolves a delivery with its group and policy data', () => {
    const group = createActionGroup({
      id: 'g1',
      policyId: 'policy-1',
      spaceId: 'space-a',
      alerts: [createAlert({ alert_id: 'a1' }), createAlert({ alert_id: 'a2' })],
      rules: { 'rule-1': { name: 'Rule 1' }, 'rule-2': { name: 'Rule 2' } },
    });

    const result = buildDispatchedWorkflows(
      createDispatcherPipelineState({
        dispatch: [group],
        policies: new Map([
          [
            'policy-1',
            createActionPolicy({
              id: 'policy-1',
              grouping: { mode: 'per_field', fields: ['host.name'] },
              throttle: { strategy: 'time_interval', interval: '1h' },
            }),
          ],
        ]),
        dispatchDeliveries: [
          { actionGroupId: 'g1', workflowId: 'wf-1', workflowExecutionId: 'exec-1' },
        ],
      })
    );

    expect(result).toEqual([
      {
        workflowId: 'wf-1',
        actionPolicyId: 'policy-1',
        workflowExecutionId: 'exec-1',
        spaceId: 'space-a',
        ruleIds: ['rule-1', 'rule-2'],
        alertCount: 2,
        throttleStrategy: 'time_interval',
        groupingMode: 'per_field',
      },
    ]);
  });

  it('resolves the default throttle strategy and grouping mode when the policy sets none', () => {
    const result = buildDispatchedWorkflows(
      createDispatcherPipelineState({
        dispatch: [createActionGroup({ id: 'g1', policyId: 'policy-1' })],
        policies: new Map([['policy-1', createActionPolicy({ id: 'policy-1' })]]),
        dispatchDeliveries: [
          { actionGroupId: 'g1', workflowId: 'wf-1', workflowExecutionId: 'exec-1' },
        ],
      })
    );

    expect(result).toEqual([
      expect.objectContaining({
        throttleStrategy: 'on_status_change',
        groupingMode: 'per_alert',
      }),
    ]);
  });

  it('returns one entry per destination when a group fans out to several workflows', () => {
    const group = createActionGroup({
      id: 'g1',
      destinations: [
        { type: 'workflow', id: 'wf-1' },
        { type: 'workflow', id: 'wf-2' },
      ],
      rules: { 'rule-1': { name: 'Rule 1' } },
    });

    const result = buildDispatchedWorkflows(
      createDispatcherPipelineState({
        dispatch: [group],
        dispatchDeliveries: [
          { actionGroupId: 'g1', workflowId: 'wf-1', workflowExecutionId: 'exec-1' },
          { actionGroupId: 'g1', workflowId: 'wf-2', workflowExecutionId: 'exec-2' },
        ],
      })
    );

    expect(result.map(({ workflowId, workflowExecutionId }) => [workflowId, workflowExecutionId])).toEqual([
      ['wf-1', 'exec-1'],
      ['wf-2', 'exec-2'],
    ]);
  });

  it('resolves each group with its own policy, space and counts', () => {
    const g1 = createActionGroup({
      id: 'g1',
      policyId: 'policy-1',
      alerts: [createAlert()],
      rules: { 'rule-1': { name: 'Rule 1' } },
    });
    const g2 = createActionGroup({
      id: 'g2',
      policyId: 'policy-2',
      alerts: [createAlert(), createAlert(), createAlert()],
      rules: { 'rule-2': { name: 'Rule 2' }, 'rule-3': { name: 'Rule 3' } },
    });

    const result = buildDispatchedWorkflows(
      createDispatcherPipelineState({
        dispatch: [g1, g2],
        dispatchDeliveries: [
          { actionGroupId: 'g1', workflowId: 'wf-1', workflowExecutionId: 'exec-1' },
          { actionGroupId: 'g2', workflowId: 'wf-1', workflowExecutionId: 'exec-2' },
        ],
      })
    );

    expect(result).toEqual([
      expect.objectContaining({ actionPolicyId: 'policy-1', ruleIds: ['rule-1'], alertCount: 1 }),
      expect.objectContaining({
        actionPolicyId: 'policy-2',
        ruleIds: ['rule-2', 'rule-3'],
        alertCount: 3,
      }),
    ]);
  });

  it('returns nothing when nothing was delivered', () => {
    const result = buildDispatchedWorkflows(
      createDispatcherPipelineState({
        dispatch: [createActionGroup({ id: 'g1' })],
        dispatchDeliveries: [],
      })
    );

    expect(result).toEqual([]);
  });

  it('returns nothing when there is no outcome', () => {
    const result = buildDispatchedWorkflows(
      createDispatcherPipelineState({ dispatch: [createActionGroup()] })
    );

    expect(result).toEqual([]);
  });

  it('skips a delivery whose group is not in the dispatch plan', () => {
    const result = buildDispatchedWorkflows(
      createDispatcherPipelineState({
        dispatch: [createActionGroup({ id: 'g1' })],
        dispatchDeliveries: [
          { actionGroupId: 'unknown', workflowId: 'wf-1', workflowExecutionId: 'exec-1' },
        ],
      })
    );

    expect(result).toEqual([]);
  });
});
