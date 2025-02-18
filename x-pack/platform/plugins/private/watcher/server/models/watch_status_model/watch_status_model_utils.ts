/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forEach, maxBy } from 'lodash';
import { ACTION_STATES, WATCH_STATES, WATCH_STATE_COMMENTS } from '../../../common/constants';
import { ServerWatchStatusModel, ClientWatchStatusModel } from '../../../common/types';

// Export for unit tests.
export const deriveActionStatusTotals = (
  actionStatuses?: ClientWatchStatusModel['actionStatuses']
) => {
  const result: { [key: string]: number } = {};

  forEach(ACTION_STATES, (state: keyof typeof ACTION_STATES) => {
    result[state] = 0;
  });

  if (actionStatuses) {
    actionStatuses.forEach((actionStatus) => {
      result[actionStatus.state] = result[actionStatus.state] + 1;
    });
  }

  return result;
};

export const deriveLastExecution = (actionStatuses: ClientWatchStatusModel['actionStatuses']) => {
  const actionStatus = maxBy(actionStatuses, 'lastExecution');
  if (actionStatus) {
    return actionStatus.lastExecution;
  }
};

export const deriveState = (
  isActive: ServerWatchStatusModel['isActive'],
  watchState: ServerWatchStatusModel['watchState'],
  actionStatuses: ClientWatchStatusModel['actionStatuses']
) => {
  if (!isActive) {
    return WATCH_STATES.INACTIVE;
  }

  if (watchState === 'failed') {
    return WATCH_STATES.ERROR;
  }

  const totals = deriveActionStatusTotals(actionStatuses);

  if (totals[ACTION_STATES.ERROR] > 0) {
    return WATCH_STATES.ERROR;
  }

  if (totals[ACTION_STATES.CONFIG_ERROR] > 0) {
    return WATCH_STATES.CONFIG_ERROR;
  }

  return WATCH_STATES.ACTIVE;
};

export const deriveComment = (
  isActive: ServerWatchStatusModel['isActive'],
  actionStatuses: ClientWatchStatusModel['actionStatuses']
) => {
  const totals = deriveActionStatusTotals(actionStatuses);
  const totalActions = actionStatuses ? actionStatuses.length : 0;

  if (!isActive) {
    return WATCH_STATE_COMMENTS.OK;
  }

  if (totals[ACTION_STATES.ERROR] > 0) {
    return WATCH_STATE_COMMENTS.FAILING;
  }

  if (
    totals[ACTION_STATES.ACKNOWLEDGED] > 0 &&
    totals[ACTION_STATES.ACKNOWLEDGED] === totalActions
  ) {
    return WATCH_STATE_COMMENTS.ACKNOWLEDGED;
  }

  if (totals[ACTION_STATES.ACKNOWLEDGED] > 0 && totals[ACTION_STATES.ACKNOWLEDGED] < totalActions) {
    return WATCH_STATE_COMMENTS.PARTIALLY_ACKNOWLEDGED;
  }

  if (totals[ACTION_STATES.THROTTLED] > 0 && totals[ACTION_STATES.THROTTLED] === totalActions) {
    return WATCH_STATE_COMMENTS.THROTTLED;
  }

  if (totals[ACTION_STATES.THROTTLED] > 0 && totals[ACTION_STATES.THROTTLED] < totalActions) {
    return WATCH_STATE_COMMENTS.PARTIALLY_THROTTLED;
  }

  return WATCH_STATE_COMMENTS.OK;
};
