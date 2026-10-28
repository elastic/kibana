/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE, type AlertEpisodeActionType } from '@kbn/alerting-v2-schemas';
import type { AnalyticsServiceSetup, EventTypeOpts } from '@kbn/core/server';
import type { EventOrigin } from '../event_origin/origin_schemas';
import type { EbtServiceContract } from '../services/ebt_service/ebt_service';
import {
  ALERT_ACK_ACTION_APPLIED_EBT_EVENT_TYPE,
  ALERT_ACTIVATE_ACTION_APPLIED_EBT_EVENT_TYPE,
  ALERT_ASSIGN_ACTION_APPLIED_EBT_EVENT_TYPE,
  ALERT_DEACTIVATE_ACTION_APPLIED_EBT_EVENT_TYPE,
  ALERT_SNOOZE_ACTION_APPLIED_EBT_EVENT_TYPE,
  ALERT_TAG_ACTION_APPLIED_EBT_EVENT_TYPE,
  ALERT_UNACK_ACTION_APPLIED_EBT_EVENT_TYPE,
  ALERT_UNSNOOZE_ACTION_APPLIED_EBT_EVENT_TYPE,
  type AlertActionAppliedEbtData,
  type AlertActionEbtEventType,
} from './alert_action_ebt_schema';

/** Action types reported as telemetry, in registration order. */
export const REPORTED_ALERT_ACTION_TYPES = [
  ALERT_EPISODE_ACTION_TYPE.ACK,
  ALERT_EPISODE_ACTION_TYPE.UNACK,
  ALERT_EPISODE_ACTION_TYPE.ASSIGN,
  ALERT_EPISODE_ACTION_TYPE.TAG,
  ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
  ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
  ALERT_EPISODE_ACTION_TYPE.SNOOZE,
  ALERT_EPISODE_ACTION_TYPE.UNSNOOZE,
] as const satisfies readonly AlertEpisodeActionType[];

/** Maps each persisted action type to the EBT event type registered for it. */
export const ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE = {
  [ALERT_EPISODE_ACTION_TYPE.ACK]: ALERT_ACK_ACTION_APPLIED_EBT_EVENT_TYPE,
  [ALERT_EPISODE_ACTION_TYPE.UNACK]: ALERT_UNACK_ACTION_APPLIED_EBT_EVENT_TYPE,
  [ALERT_EPISODE_ACTION_TYPE.ASSIGN]: ALERT_ASSIGN_ACTION_APPLIED_EBT_EVENT_TYPE,
  [ALERT_EPISODE_ACTION_TYPE.TAG]: ALERT_TAG_ACTION_APPLIED_EBT_EVENT_TYPE,
  [ALERT_EPISODE_ACTION_TYPE.ACTIVATE]: ALERT_ACTIVATE_ACTION_APPLIED_EBT_EVENT_TYPE,
  [ALERT_EPISODE_ACTION_TYPE.DEACTIVATE]: ALERT_DEACTIVATE_ACTION_APPLIED_EBT_EVENT_TYPE,
  [ALERT_EPISODE_ACTION_TYPE.SNOOZE]: ALERT_SNOOZE_ACTION_APPLIED_EBT_EVENT_TYPE,
  [ALERT_EPISODE_ACTION_TYPE.UNSNOOZE]: ALERT_UNSNOOZE_ACTION_APPLIED_EBT_EVENT_TYPE,
} as const satisfies Record<AlertEpisodeActionType, AlertActionEbtEventType>;

const alertActionAppliedEventSchema: EventTypeOpts<AlertActionAppliedEbtData>['schema'] = {
  space_id: {
    type: 'keyword',
    _meta: {
      description: 'The space the action occurred in.',
      optional: false,
    },
  },
  rule_id: {
    type: 'keyword',
    _meta: {
      description:
        'The id of the rule that produced the alert. Absent when the alert has no rule id.',
      optional: true,
    },
  },
  origin: {
    properties: {
      actor: {
        type: 'keyword',
        _meta: {
          description:
            'Who applied the action: `user` for a request carrying credentials, or `internal` for the Kibana internal user acting on its own.',
          optional: false,
        },
      },
      channel: {
        type: 'keyword',
        _meta: {
          description:
            'How the action reached Kibana: `ui` for requests made by the Kibana browser app, `system` for Kibana acting on its own behalf, or `api` for any other request.',
          optional: false,
        },
      },
      app: {
        type: 'keyword',
        _meta: {
          description:
            'The app the action was applied from. For `ui` requests, the app named in the execution context. Absent otherwise.',
          optional: true,
        },
      },
    },
    _meta: {
      description: 'Where the action came from.',
      optional: false,
    },
  },
  alert_count: {
    type: 'long',
    _meta: {
      description:
        'Number of successfully applied alerts for this action, space, and rule. A bulk call that spans rules reports one event per rule.',
      optional: false,
    },
  },
};

/** One registered event per action type. Every event uses {@link AlertActionAppliedEbtData}. */
export const alertActionTelemetryEvents: Array<EventTypeOpts<AlertActionAppliedEbtData>> =
  REPORTED_ALERT_ACTION_TYPES.map((actionType) => ({
    eventType: ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE[actionType],
    schema: alertActionAppliedEventSchema,
  }));

/** Registers every alert-action EBT event type with Core analytics. */
export const registerAlertActionTelemetryEvents = (analytics: AnalyticsServiceSetup): void => {
  alertActionTelemetryEvents.forEach((eventConfig) => analytics.registerEventType(eventConfig));
};

/** An applied alert action reduced to the fields telemetry is allowed to read. */
export interface AppliedAlertAction {
  readonly actionType: string;
  readonly spaceId: string;
  readonly ruleId: string | null;
  readonly origin: EventOrigin;
}

interface AlertActionTelemetryGroup {
  actionType: AlertEpisodeActionType;
  spaceId: string;
  ruleId: string | null;
  origin: EventOrigin;
  alertCount: number;
}

const reportedActionTypes: ReadonlySet<string> = new Set(REPORTED_ALERT_ACTION_TYPES);

const isReportedActionType = (actionType: string): actionType is AlertEpisodeActionType =>
  reportedActionTypes.has(actionType);

/**
 * One event per action type, space, rule, and origin. A bulk call that spans
 * rules reports one event per rule, and `alert_count` is that group's size, so
 * `rule_id` stays the rule that produced those alerts. Assign and
 * clear-assignee share `assign`.
 *
 * Action types outside {@link REPORTED_ALERT_ACTION_TYPES} are omitted, so
 * `alert_count` counts reported actions only.
 */
const groupAppliedAlertActions = (
  actions: readonly AppliedAlertAction[]
): AlertActionTelemetryGroup[] => {
  const groups = new Map<string, AlertActionTelemetryGroup>();

  for (const action of actions) {
    if (!isReportedActionType(action.actionType)) {
      continue;
    }

    const { actor, channel, app = '' } = action.origin;
    // Action types, space ids, rule ids, and origin fields cannot contain NUL.
    const key = `${action.actionType}\0${action.spaceId}\0${
      action.ruleId ?? ''
    }\0${actor}\0${channel}\0${app}`;
    const existing = groups.get(key);
    if (existing) {
      existing.alertCount += 1;
      continue;
    }

    groups.set(key, {
      actionType: action.actionType,
      spaceId: action.spaceId,
      ruleId: action.ruleId,
      origin: action.origin,
      alertCount: 1,
    });
  }

  return [...groups.values()];
};

/** Projects an alert-action telemetry payload. `rule_id` is omitted when it is null. */
export const buildAlertActionAppliedEventData = (
  group: Pick<AlertActionTelemetryGroup, 'spaceId' | 'ruleId' | 'origin' | 'alertCount'>
): AlertActionAppliedEbtData => ({
  space_id: group.spaceId,
  ...(group.ruleId != null ? { rule_id: group.ruleId } : {}),
  origin: group.origin,
  alert_count: group.alertCount,
});

/** Reports one EBT event per action type, space, rule, and origin. */
export const reportAppliedAlertActions = (
  ebtService: EbtServiceContract,
  actions: readonly AppliedAlertAction[]
): void => {
  for (const group of groupAppliedAlertActions(actions)) {
    ebtService.reportEvent(
      ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE[group.actionType],
      buildAlertActionAppliedEventData(group)
    );
  }
};
