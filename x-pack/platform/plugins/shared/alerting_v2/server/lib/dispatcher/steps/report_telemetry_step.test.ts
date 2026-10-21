/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockEbtService } from '../../services/ebt_service/ebt_service.mock';
import {
  WORKFLOW_DISPATCHED_EBT_EVENT_TYPE,
  type WorkflowDispatchedEbtData,
} from '../../telemetry/workflow_ebt_schema';
import {
  createActionGroup,
  createActionPolicy,
  createAlert,
  createDispatcherPipelineState,
  createStepLogger,
} from '../fixtures/test_utils';
import { ReportTelemetryStep } from './report_telemetry_step';

const logger = createStepLogger();

const reportedDispatches = (
  ebtService: ReturnType<typeof createMockEbtService>
): WorkflowDispatchedEbtData[] =>
  ebtService.reportEvent.mock.calls
    .map(([, data]) => data)
    .filter((data): data is WorkflowDispatchedEbtData => 'workflow_id' in data);

describe('ReportTelemetryStep', () => {
  let ebtService: ReturnType<typeof createMockEbtService>;
  let step: ReportTelemetryStep;

  beforeEach(() => {
    ebtService = createMockEbtService();
    step = new ReportTelemetryStep(ebtService);
  });

  it('reports one event for a delivery', async () => {
    const group = createActionGroup({
      id: 'g1',
      policyId: 'policy-1',
      spaceId: 'space-a',
      alerts: [createAlert({ alert_id: 'a1' }), createAlert({ alert_id: 'a2' })],
      rules: { 'rule-1': { name: 'Rule 1' }, 'rule-2': { name: 'Rule 2' } },
    });

    const result = await step.execute(
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
      }),
      logger
    );

    expect(result).toEqual({ type: 'continue' });
    expect(ebtService.reportEvent).toHaveBeenCalledTimes(1);
    expect(ebtService.reportEvent).toHaveBeenCalledWith(WORKFLOW_DISPATCHED_EBT_EVENT_TYPE, {
      workflow_id: 'wf-1',
      action_policy_id: 'policy-1',
      workflow_execution_id: 'exec-1',
      space_id: 'space-a',
      rule_id: ['rule-1', 'rule-2'],
      alert_count: 2,
      rule_count: 2,
      throttle_strategy: 'time_interval',
      grouping_mode: 'per_field',
    });
  });

  it('reports the default throttle strategy and grouping mode when the policy sets none', async () => {
    const group = createActionGroup({ id: 'g1', policyId: 'policy-1' });

    await step.execute(
      createDispatcherPipelineState({
        dispatch: [group],
        policies: new Map([['policy-1', createActionPolicy({ id: 'policy-1' })]]),
        dispatchDeliveries: [
          { actionGroupId: 'g1', workflowId: 'wf-1', workflowExecutionId: 'exec-1' },
        ],
      }),
      logger
    );

    expect(ebtService.reportEvent).toHaveBeenCalledWith(
      WORKFLOW_DISPATCHED_EBT_EVENT_TYPE,
      expect.objectContaining({ throttle_strategy: 'on_status_change', grouping_mode: 'per_alert' })
    );
  });

  it('reports one event per destination when a group fans out to several workflows', async () => {
    const group = createActionGroup({
      id: 'g1',
      destinations: [
        { type: 'workflow', id: 'wf-1' },
        { type: 'workflow', id: 'wf-2' },
      ],
      rules: { 'rule-1': { name: 'Rule 1' } },
    });

    await step.execute(
      createDispatcherPipelineState({
        dispatch: [group],
        dispatchDeliveries: [
          { actionGroupId: 'g1', workflowId: 'wf-1', workflowExecutionId: 'exec-1' },
          { actionGroupId: 'g1', workflowId: 'wf-2', workflowExecutionId: 'exec-2' },
        ],
      }),
      logger
    );

    expect(ebtService.reportEvent).toHaveBeenCalledTimes(2);
    expect(
      reportedDispatches(ebtService).map((data) => [data.workflow_id, data.workflow_execution_id])
    ).toEqual([
      ['wf-1', 'exec-1'],
      ['wf-2', 'exec-2'],
    ]);
  });

  it('reports each group with its own policy, space and counts', async () => {
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

    await step.execute(
      createDispatcherPipelineState({
        dispatch: [g1, g2],
        dispatchDeliveries: [
          { actionGroupId: 'g1', workflowId: 'wf-1', workflowExecutionId: 'exec-1' },
          { actionGroupId: 'g2', workflowId: 'wf-1', workflowExecutionId: 'exec-2' },
        ],
      }),
      logger
    );

    expect(ebtService.reportEvent.mock.calls.map(([, data]) => data)).toEqual([
      expect.objectContaining({
        action_policy_id: 'policy-1',
        rule_id: ['rule-1'],
        alert_count: 1,
        rule_count: 1,
      }),
      expect.objectContaining({
        action_policy_id: 'policy-2',
        rule_id: ['rule-2', 'rule-3'],
        alert_count: 3,
        rule_count: 2,
      }),
    ]);
  });

  it('does not report when nothing was delivered', async () => {
    const group = createActionGroup({ id: 'g1' });

    await step.execute(
      createDispatcherPipelineState({ dispatch: [group], dispatchDeliveries: [] }),
      logger
    );

    expect(ebtService.reportEvent).not.toHaveBeenCalled();
  });

  it('does not report when there is no outcome', async () => {
    await step.execute(createDispatcherPipelineState({ dispatch: [createActionGroup()] }), logger);

    expect(ebtService.reportEvent).not.toHaveBeenCalled();
  });

  it('skips a delivery whose group is not in the dispatch plan', async () => {
    await step.execute(
      createDispatcherPipelineState({
        dispatch: [createActionGroup({ id: 'g1' })],
        dispatchDeliveries: [
          { actionGroupId: 'unknown', workflowId: 'wf-1', workflowExecutionId: 'exec-1' },
        ],
      }),
      logger
    );

    expect(ebtService.reportEvent).not.toHaveBeenCalled();
  });
});
