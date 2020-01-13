/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';
import { getActionType } from '../../../common/lib/get_action_type';
import { ACTION_TYPES } from '../../../common/constants';
import { LoggingAction } from './logging_action';
import { EmailAction } from './email_action';
import { SlackAction } from './slack_action';
import { IndexAction } from './index_action';
import { WebhookAction } from './webhook_action';
import { PagerDutyAction } from './pagerduty_action';
import { JiraAction } from './jira_action';
import { UnknownAction } from './unknown_action';

const ActionTypes = {};
set(ActionTypes, ACTION_TYPES.LOGGING, LoggingAction);
set(ActionTypes, ACTION_TYPES.EMAIL, EmailAction);
set(ActionTypes, ACTION_TYPES.SLACK, SlackAction);
set(ActionTypes, ACTION_TYPES.INDEX, IndexAction);
set(ActionTypes, ACTION_TYPES.WEBHOOK, WebhookAction);
set(ActionTypes, ACTION_TYPES.PAGERDUTY, PagerDutyAction);
set(ActionTypes, ACTION_TYPES.JIRA, JiraAction);
set(ActionTypes, ACTION_TYPES.UNKNOWN, UnknownAction);

export class Action {
  static getActionTypes = () => {
    return ActionTypes;
  };

  // From Elasticsearch
  static fromUpstreamJson(json) {
    const type = getActionType(json.actionJson);
    const ActionType = ActionTypes[type] || UnknownAction;
    const { action } = ActionType.fromUpstreamJson(json);
    return action;
  }

  // From Kibana
  static fromDownstreamJson(json) {
    const ActionType = ActionTypes[json.type] || UnknownAction;
    const { action } = ActionType.fromDownstreamJson(json);
    return action;
  }
}
