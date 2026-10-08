/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import {
  alertActionActorType,
  type AlertActionDocument,
} from '../../../resources/datastreams/alert_actions';
import type {
  Alert,
  DispatcherStep,
  DispatcherPipelineState,
  DispatcherStepOutput,
} from '../types';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import type { StorageServiceContract } from '../../services/storage_service/storage_service';
import { StorageServiceInternalToken } from '../../services/storage_service/tokens';
import { DispatchPlan, AlertTriage, PolicyCatalog } from '../state';

@injectable()
export class StoreActionsStep implements DispatcherStep {
  public readonly name = 'record_actions';

  constructor(
    @inject(StorageServiceInternalToken) private readonly storageService: StorageServiceContract
  ) {}

  public async execute(
    state: Readonly<DispatcherPipelineState>,
    _: LoggerServiceContract
  ): Promise<DispatcherStepOutput> {
    const {
      triage = AlertTriage.empty(),
      plan = DispatchPlan.empty(),
      policies = PolicyCatalog.empty(),
    } = state;
    const { suppressed } = triage;
    const { toDispatch, throttled, unmatched } = plan;

    if (suppressed.length === 0 && plan.isEmpty() && unmatched.length === 0) {
      return { type: 'halt', reason: 'no_actions' };
    }

    const now = new Date();

    // One doc per alert-scoped outcome; their count gates watermark advancement.
    const alertActions: AlertActionDocument[] = [
      ...suppressed.map((alert) =>
        toAction({
          alert,
          actionType: 'suppress',
          reason: alert.reason,
          spaceId: alert.space_id,
        })
      ),
      ...throttled.flatMap((group) =>
        group.alerts.map((alert) =>
          toAction({
            alert,
            actionType: 'suppress',
            reason: `suppressed by throttled policy ${group.policyId}`,
            spaceId: alert.space_id,
          })
        )
      ),
      ...toDispatch.flatMap((group) =>
        group.alerts.map((alert) =>
          toAction({
            alert,
            actionType: 'fire',
            reason: `dispatched by policy ${group.policyId}`,
            spaceId: alert.space_id,
          })
        )
      ),
      ...unmatched.map((alert) =>
        toAction({
          alert,
          actionType: 'unmatched',
          reason: 'no matching action policy',
          spaceId: alert.space_id,
        })
      ),
    ];

    // One `notified` doc per dispatched group — group-scoped, so excluded from
    // the recordedAlerts tally.
    const notifiedActions: AlertActionDocument[] = toDispatch.map((group) => {
      const groupingMode = policies.groupingModeOf(group.policyId);
      const firstAlert = group.alerts[0];
      const spaceId = firstAlert?.space_id ?? 'default';
      const action: AlertActionDocument = {
        actor: { type: alertActionActorType.internal },
        action_type: 'notified',
        rule_id: firstAlert?.rule_id ?? null,
        group_hash: firstAlert?.group_hash ?? 'unknown',
        last_series_event_timestamp: now.toISOString(),
        action_group_id: group.id,
        source: firstAlert?.source,
        reason: `notified by policy ${group.policyId}`,
        space_id: spaceId,
      };
      if (groupingMode === 'per_alert') {
        action.alert_status = firstAlert?.alert_status;
      }
      return action;
    });

    await this.storageService.bulkIndexDocs<AlertActionDocument>({
      index: ALERT_ACTIONS_DATA_STREAM,
      docs: [...alertActions, ...notifiedActions],
    });

    return { type: 'continue', data: { recordedAlerts: alertActions.length } };
  }
}

export function toAction({
  alert,
  actionType,
  reason,
  spaceId,
}: {
  alert: Alert;
  actionType: 'suppress' | 'fire' | 'notified' | 'unmatched';
  reason?: string;
  spaceId: string;
}): AlertActionDocument {
  return {
    group_hash: alert.group_hash,
    last_series_event_timestamp: alert.last_event_timestamp,
    actor: { type: alertActionActorType.internal },
    action_type: actionType,
    rule_id: alert.rule_id,
    source: alert.source,
    reason,
    space_id: spaceId,
  };
}
