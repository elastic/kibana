/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import type { AlertActionDocument } from '../../../resources/datastreams/alert_actions';
import type { DispatcherStep, DispatcherPipelineState, DispatcherStepOutput } from '../types';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import type { StorageServiceContract } from '../../services/storage_service/storage_service';
import { StorageServiceInternalToken } from '../../services/storage_service/tokens';
import { DispatchOutcome, DispatchPlan, AlertTriage, PolicyCatalog } from '../state';
import { toAction, toNotifiedActions } from './utils/action_documents';

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
      outcome = DispatchOutcome.empty(),
    } = state;
    const { suppressed } = triage;
    const { toDispatch, throttled, alreadyNotified, unmatched } = plan;

    if (suppressed.length === 0 && plan.isEmpty() && unmatched.length === 0) {
      return { type: 'halt', reason: 'no_actions' };
    }

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
      ...alreadyNotified.flatMap((group) =>
        group.alerts.map((alert) =>
          toAction({
            alert,
            actionType: 'fire',
            reason: `already notified by policy ${group.policyId}`,
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

    // `notified` docs are group-scoped, so excluded from the recordedAlerts tally. DispatchStep
    // writes them after each chunk; this covers the dispatched groups it did not commit.
    const notifiedActions = toDispatch
      .filter((group) => !outcome.isCommitted(group.id))
      .flatMap((group) => toNotifiedActions(group, policies.groupingModeOf(group.policyId)));

    await this.storageService.bulkIndexDocs<AlertActionDocument>({
      index: ALERT_ACTIONS_DATA_STREAM,
      docs: [...alertActions, ...notifiedActions],
    });

    return { type: 'continue', data: { recordedAlerts: alertActions.length } };
  }
}
