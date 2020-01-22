/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, map, forEach, max } from 'lodash';
import { badRequest } from 'boom';
import { getMoment } from '../../../../common/lib/get_moment';
import { ActionStatus } from '../action_status';
import { ACTION_STATES, WATCH_STATES, WATCH_STATE_COMMENTS } from '../../../../common/constants';
import { i18n } from '@kbn/i18n';

function getActionStatusTotals(watchStatus) {
  const result = {};

  forEach(ACTION_STATES, state => {
    result[state] = 0;
  });
  forEach(watchStatus.actionStatuses, actionStatus => {
    result[actionStatus.state] = result[actionStatus.state] + 1;
  });

  return result;
}

const WATCH_STATE_FAILED = 'failed';

export class WatchStatus {
  constructor(props) {
    this.id = props.id;
    this.watchState = props.state;
    this.watchStatusJson = props.watchStatusJson;
    this.watchErrors = props.watchErrors || {};

    this.isActive = Boolean(get(this.watchStatusJson, 'state.active'));
    this.lastChecked = getMoment(get(this.watchStatusJson, 'last_checked'));
    this.lastMetCondition = getMoment(get(this.watchStatusJson, 'last_met_condition'));

    const actionStatusesJson = get(this.watchStatusJson, 'actions', {});
    this.actionStatuses = map(actionStatusesJson, (actionStatusJson, id) => {
      const json = {
        id,
        actionStatusJson,
        errors: this.watchErrors.actions && this.watchErrors.actions[id],
      };
      return ActionStatus.fromUpstreamJson(json);
    });
  }

  get state() {
    if (!this.isActive) {
      return WATCH_STATES.DISABLED;
    }

    if (this.watchState === WATCH_STATE_FAILED) {
      return WATCH_STATES.ERROR;
    }

    const totals = getActionStatusTotals(this);

    if (totals[ACTION_STATES.ERROR] > 0) {
      return WATCH_STATES.ERROR;
    }

    if (totals[ACTION_STATES.CONFIG_ERROR] > 0) {
      return WATCH_STATES.CONFIG_ERROR;
    }

    const firingTotal =
      totals[ACTION_STATES.FIRING] +
      totals[ACTION_STATES.ACKNOWLEDGED] +
      totals[ACTION_STATES.THROTTLED];

    if (firingTotal > 0) {
      return WATCH_STATES.FIRING;
    }

    return WATCH_STATES.OK;
  }

  get comment() {
    const totals = getActionStatusTotals(this);
    const totalActions = this.actionStatuses.length;
    let result = WATCH_STATE_COMMENTS.OK;

    if (totals[ACTION_STATES.THROTTLED] > 0 && totals[ACTION_STATES.THROTTLED] < totalActions) {
      result = WATCH_STATE_COMMENTS.PARTIALLY_THROTTLED;
    }

    if (totals[ACTION_STATES.THROTTLED] > 0 && totals[ACTION_STATES.THROTTLED] === totalActions) {
      result = WATCH_STATE_COMMENTS.THROTTLED;
    }

    if (
      totals[ACTION_STATES.ACKNOWLEDGED] > 0 &&
      totals[ACTION_STATES.ACKNOWLEDGED] < totalActions
    ) {
      result = WATCH_STATE_COMMENTS.PARTIALLY_ACKNOWLEDGED;
    }

    if (
      totals[ACTION_STATES.ACKNOWLEDGED] > 0 &&
      totals[ACTION_STATES.ACKNOWLEDGED] === totalActions
    ) {
      result = WATCH_STATE_COMMENTS.ACKNOWLEDGED;
    }

    if (totals[ACTION_STATES.ERROR] > 0) {
      result = WATCH_STATE_COMMENTS.FAILING;
    }

    if (!this.isActive) {
      result = WATCH_STATE_COMMENTS.OK;
    }

    return result;
  }

  get lastFired() {
    const actionStatus = max(this.actionStatuses, 'lastExecution');
    if (actionStatus) {
      return actionStatus.lastExecution;
    }
  }

  // generate object to send to kibana
  get downstreamJson() {
    const json = {
      id: this.id,
      state: this.state,
      comment: this.comment,
      isActive: this.isActive,
      lastChecked: this.lastChecked,
      lastMetCondition: this.lastMetCondition,
      lastFired: this.lastFired,
      actionStatuses: map(this.actionStatuses, actionStatus => actionStatus.downstreamJson),
    };

    return json;
  }

  // generate object from elasticsearch response
  static fromUpstreamJson(json) {
    if (!json.id) {
      throw badRequest(
        i18n.translate('xpack.watcher.models.watchStatus.idPropertyMissingBadRequestMessage', {
          defaultMessage: 'JSON argument must contain an {id} property',
          values: {
            id: 'id',
          },
        })
      );
    }
    if (!json.watchStatusJson) {
      throw badRequest(
        i18n.translate(
          'xpack.watcher.models.watchStatus.watchStatusJsonPropertyMissingBadRequestMessage',
          {
            defaultMessage: 'JSON argument must contain a {watchStatusJson} property',
            values: {
              watchStatusJson: 'watchStatusJson',
            },
          }
        )
      );
    }

    return new WatchStatus(json);
  }

  /*
  json.watchStatusJson should have the following structure:
  {
    "state": {
      "active": true,
      "timestamp": "2017-03-01T19:05:49.400Z"
    },
    "actions": {
      "log-me-something": {
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
    },
    "version": 15,
    "last_checked": "2017-03-02T14:25:31.139Z",
    "last_met_condition": "2017-03-02T14:25:31.139Z"
  }
  */
}
