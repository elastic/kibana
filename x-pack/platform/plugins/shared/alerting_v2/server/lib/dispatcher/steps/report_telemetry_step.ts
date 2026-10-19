/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { WORKFLOW_DISPATCHED_EBT_EVENT_TYPE } from '@kbn/alerting-v2-schemas';
import type { EbtServiceContract } from '../../services/ebt_service/ebt_service';
import { EbtServiceToken } from '../../services/ebt_service/tokens';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import { buildWorkflowDispatchedEventData } from '../../telemetry/workflow_dispatched_ebt_event';
import { DispatchOutcome, DispatchPlan } from '../state';
import type {
  ActionGroup,
  ActionGroupId,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
} from '../types';

/**
 * Reports one `alerting_v2_workflow_dispatched` EBT event per successful
 * (group, workflow) delivery recorded by {@link DispatchStep}.
 */
@injectable()
export class ReportTelemetryStep implements DispatcherStep {
  public readonly name = 'report_telemetry';

  constructor(@inject(EbtServiceToken) private readonly ebtService: EbtServiceContract) {}

  public async execute(
    state: Readonly<DispatcherPipelineState>,
    _: LoggerServiceContract
  ): Promise<DispatcherStepOutput> {
    const { plan = DispatchPlan.empty(), outcome = DispatchOutcome.empty() } = state;

    const groupsById = new Map<ActionGroupId, ActionGroup>(
      plan.toDispatch.map((group) => [group.id, group])
    );

    for (const { actionGroupId, workflowId, workflowExecutionId } of outcome.deliveries) {
      const group = groupsById.get(actionGroupId);
      if (!group) {
        continue;
      }

      this.ebtService.reportEvent(
        WORKFLOW_DISPATCHED_EBT_EVENT_TYPE,
        buildWorkflowDispatchedEventData({
          workflowId,
          actionPolicyId: group.policyId,
          workflowExecutionId,
          spaceId: group.spaceId,
          ruleIds: Object.keys(group.rules),
          alertCount: group.alerts.length,
        })
      );
    }

    return { type: 'continue' };
  }
}
