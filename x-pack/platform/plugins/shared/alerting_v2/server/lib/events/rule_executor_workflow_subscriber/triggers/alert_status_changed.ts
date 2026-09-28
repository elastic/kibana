/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { alertStatusChangedEventSchema } from '../../../../../common/workflows/triggers';
import {
  AlertStatusChangedTriggerId,
  alertStatusChangedCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  ALERT_STATUS_CHANGED_BUS_EVENT_TYPE,
  type AlertStatusChangedBusEvent,
} from '../../rule_executor_event_publisher/events';
import type { RuleExecutorWorkflowTriggerBinding } from './types';

export { AlertStatusChangedTriggerId } from '../../../../../common/workflows/triggers';

/**
 * Projects one `alert.status.changed` bus event (one episode transition) onto
 * the `alerting.alertStatusChanged` workflow trigger.
 *
 * The bus event fires once per episode transition in a successful run. This
 * binding reshapes the flat bus payload into the nested workflow trigger payload.
 * Every transition produces one workflow event — `toPayload` never returns null
 * because the director only emits transitions when a status change actually
 * occurred.
 *
 * Adding or renaming a field requires updating {@link alertStatusChangedEventSchema}
 * and this mapping together so the registered schema and the runtime payload
 * stay in lockstep.
 */
export const alertStatusChangedTrigger: RuleExecutorWorkflowTriggerBinding<
  AlertStatusChangedBusEvent,
  typeof alertStatusChangedEventSchema
> = {
  eventType: ALERT_STATUS_CHANGED_BUS_EVENT_TYPE,
  triggerId: AlertStatusChangedTriggerId,
  definition: alertStatusChangedCommonDefinition,
  toPayload: (event) => {
    const {
      executionId,
      scheduledAt,
      rule: { ruleId, name, spaceId, tags },
      transition: { groupHash, episodeId, source, status, previousStatus },
    } = event.payload;

    return {
      rule: { id: ruleId, name, spaceId, tags: [...tags] },
      alert: { groupHash, episodeId, source, status, previousStatus },
      execution: { executionId, scheduledAt },
    };
  },
};
