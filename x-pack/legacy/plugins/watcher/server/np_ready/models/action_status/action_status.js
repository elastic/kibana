/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { badImplementation, badRequest } from 'boom';
import { getMoment } from '../../../../common/lib/get_moment';
import { ACTION_STATES } from '../../../../common/constants';
import { i18n } from '@kbn/i18n';

export class ActionStatus {
  constructor(props) {
    this.id = props.id;
    this.actionStatusJson = props.actionStatusJson;
    this.errors = props.errors;

    this.lastAcknowledged = getMoment(get(this.actionStatusJson, 'ack.timestamp'));
    this.lastExecution = getMoment(get(this.actionStatusJson, 'last_execution.timestamp'));
    this.lastExecutionSuccessful = get(this.actionStatusJson, 'last_execution.successful');
    this.lastExecutionReason = get(this.actionStatusJson, 'last_execution.reason');
    this.lastThrottled = getMoment(get(this.actionStatusJson, 'last_throttle.timestamp'));
    this.lastSuccessfulExecution = getMoment(
      get(this.actionStatusJson, 'last_successful_execution.timestamp')
    );
  }

  get state() {
    const actionStatusJson = this.actionStatusJson;
    const ackState = actionStatusJson.ack.state;

    if (this.lastExecutionSuccessful === false) {
      return ACTION_STATES.ERROR;
    }

    if (this.errors) {
      return ACTION_STATES.CONFIG_ERROR;
    }

    if (ackState === 'awaits_successful_execution') {
      return ACTION_STATES.OK;
    }

    if (ackState === 'acked' && this.lastAcknowledged >= this.lastExecution) {
      return ACTION_STATES.ACKNOWLEDGED;
    }

    if (ackState === 'ackable' && this.lastThrottled >= this.lastExecution) {
      return ACTION_STATES.THROTTLED;
    }

    if (ackState === 'ackable' && this.lastSuccessfulExecution >= this.lastExecution) {
      return ACTION_STATES.FIRING;
    }

    if (ackState === 'ackable' && this.lastSuccessfulExecution < this.lastExecution) {
      return ACTION_STATES.ERROR;
    }

    // At this point, we cannot determine the action status so we thrown an error.
    // We should never get to this point in the code. If we do, it means we are
    // missing an action status and the logic to determine it.
    throw badImplementation(
      i18n.translate(
        'xpack.watcher.models.actionStatus.notDetermineActionStatusBadImplementationMessage',
        {
          defaultMessage: 'Could not determine action status; action = {actionStatusJson}',
          values: {
            actionStatusJson: JSON.stringify(actionStatusJson),
          },
        }
      )
    );
  }

  get isAckable() {
    if (this.state === ACTION_STATES.THROTTLED || this.state === ACTION_STATES.FIRING) {
      return true;
    }

    return false;
  }

  // generate object to send to kibana
  get downstreamJson() {
    const json = {
      id: this.id,
      state: this.state,
      isAckable: this.isAckable,
      lastAcknowledged: this.lastAcknowledged,
      lastThrottled: this.lastThrottled,
      lastExecution: this.lastExecution,
      lastExecutionSuccessful: this.lastExecutionSuccessful,
      lastExecutionReason: this.lastExecutionReason,
      lastSuccessfulExecution: this.lastSuccessfulExecution,
    };

    return json;
  }

  // generate object from elasticsearch response
  static fromUpstreamJson(json) {
    const missingPropertyError = missingProperty =>
      i18n.translate(
        'xpack.watcher.models.actionStatus.actionStatusJsonPropertyMissingBadRequestMessage',
        {
          defaultMessage: 'JSON argument must contain an "{missingProperty}" property',
          values: { missingProperty },
        }
      );

    if (!json.id) {
      throw badRequest(missingPropertyError('id'));
    }

    if (!json.actionStatusJson) {
      throw badRequest(missingPropertyError('actionStatusJson'));
    }

    return new ActionStatus(json);
  }

  /*
  json.actionStatusJson should have the following structure:
  {
    "ack": {
      "timestamp": "2017-03-01T20:56:58.442Z",
      "state": "acked"
    },
    "last_execution": {
      "timestamp": "2017-03-01T20:55:49.679Z",
      "successful": true
    },
    "last_successful_execution": {
      "timestamp": "2017-03-01T20:55:49.679Z",
      "successful": true
    }
  }
  */
}
