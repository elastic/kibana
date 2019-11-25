/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';
import { DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';
import { updateSignal } from '../alerts/update_signals';
import { UpdateSignalsRequest } from '../alerts/types';
import { updateSignalSchema } from './schemas';
import { ServerFacade } from '../../../types';
import { getIdError, transformOrError } from './utils';

export const createUpdateSignalsRoute: Hapi.ServerRoute = {
  method: 'PUT',
  path: DETECTION_ENGINE_RULES_URL,
  options: {
    tags: ['access:signals-all'],
    validate: {
      options: {
        abortEarly: false,
      },
      payload: updateSignalSchema,
    },
  },
  async handler(request: UpdateSignalsRequest, headers) {
    const {
      description,
      enabled,
      false_positives: falsePositives,
      filter,
      from,
      immutable,
      query,
      language,
      output_index: outputIndex,
      saved_id: savedId,
      meta,
      filters,
      rule_id: ruleId,
      id,
      index,
      interval,
      max_signals: maxSignals,
      risk_score: riskScore,
      name,
      severity,
      size,
      tags,
      to,
      type,
      references,
    } = request.payload;

    const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
    const actionsClient = isFunction(request.getActionsClient) ? request.getActionsClient() : null;

    if (!alertsClient || !actionsClient) {
      return headers.response().code(404);
    }

    const signal = await updateSignal({
      alertsClient,
      actionsClient,
      description,
      enabled,
      falsePositives,
      filter,
      from,
      immutable,
      query,
      language,
      outputIndex,
      savedId,
      meta,
      filters,
      id,
      ruleId,
      index,
      interval,
      maxSignals,
      riskScore,
      name,
      severity,
      size,
      tags,
      to,
      type,
      references,
    });
    if (signal != null) {
      return transformOrError(signal);
    } else {
      return getIdError({ id, ruleId });
    }
  },
};

export const updateSignalsRoute = (server: ServerFacade) => {
  server.route(createUpdateSignalsRoute);
};
