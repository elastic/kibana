/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE, type AlertEpisodeActionType } from '@kbn/alerting-v2-schemas';
import type { EventTypeOpts } from '@kbn/core/server';
import type { EventOrigin } from '../event_origin/origin_schemas';
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
      description: 'Each applied alert is reported as its own event, so this count is 1.',
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

/** Projects an alert-action telemetry payload. `rule_id` is omitted when it is null. */
export const buildAlertActionAppliedEventData = (event: {
  spaceId: string;
  ruleId: string | null;
  origin: EventOrigin;
}): AlertActionAppliedEbtData => ({
  space_id: event.spaceId,
  ...(event.ruleId != null ? { rule_id: event.ruleId } : {}),
  origin: event.origin,
  alert_count: 1,
});
