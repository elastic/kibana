/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { i18n } from '@kbn/i18n';

import { ActionStatusModelEs, ServerActionStatusModel } from '../../../common/types';
import { getMoment } from '../../../common/lib/get_moment';
import { deriveState } from './action_status_model_utils';

export const buildServerActionStatusModel = (
  actionStatusModelEs: ActionStatusModelEs
): ServerActionStatusModel => {
  const { id, actionStatusJson, errors, lastCheckedRawFormat } = actionStatusModelEs;

  const missingPropertyError = (missingProperty: string) =>
    i18n.translate(
      'xpack.watcher.models.actionStatus.actionStatusJsonPropertyMissingBadRequestMessage',
      {
        defaultMessage: 'JSON argument must contain an "{missingProperty}" property',
        values: { missingProperty },
      }
    );

  // TODO: Remove once all consumers and upstream dependencies are converted to TS.
  if (!id) {
    throw badRequest(missingPropertyError('id'));
  }

  // TODO: Remove once all consumers and upstream dependencies are converted to TS.
  if (!actionStatusJson) {
    throw badRequest(missingPropertyError('actionStatusJson'));
  }

  return {
    id,
    actionStatusJson,
    errors,
    lastCheckedRawFormat,
    lastExecutionRawFormat: actionStatusJson.last_execution?.timestamp,
    lastAcknowledged: getMoment(actionStatusJson.ack.timestamp),
    lastExecution: getMoment(actionStatusJson.last_execution?.timestamp),
    isLastExecutionSuccessful: actionStatusJson.last_execution?.successful,
    lastExecutionReason: actionStatusJson.last_execution?.reason,
    lastThrottled: getMoment(actionStatusJson.last_throttle?.timestamp),
    lastSuccessfulExecution: getMoment(actionStatusJson.last_successful_execution?.timestamp),
  };
};

export const buildClientActionStatusModel = (serverActionStatusModel: ServerActionStatusModel) => {
  const {
    id,
    lastAcknowledged,
    lastThrottled,
    lastExecution,
    isLastExecutionSuccessful,
    lastExecutionReason,
    lastSuccessfulExecution,
  } = serverActionStatusModel;
  const state = deriveState(serverActionStatusModel);
  const isAckable = serverActionStatusModel.actionStatusJson.ack.state === 'ackable';

  return {
    id,
    lastAcknowledged,
    lastThrottled,
    lastExecution,
    isLastExecutionSuccessful,
    lastExecutionReason,
    lastSuccessfulExecution,
    state,
    isAckable,
  };
};
