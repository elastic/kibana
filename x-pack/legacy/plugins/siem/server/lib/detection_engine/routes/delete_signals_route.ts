/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';

import { DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';
import { deleteSignals } from '../alerts/delete_signals';
import { ServerFacade } from '../../../types';
import { querySignalSchema } from './schemas';
import { QueryRequest } from '../alerts/types';
import { getIdError, transformOrError } from './utils';

export const createDeleteSignalsRoute: Hapi.ServerRoute = {
  method: 'DELETE',
  path: DETECTION_ENGINE_RULES_URL,
  options: {
    tags: ['access:signals-all'],
    validate: {
      options: {
        abortEarly: false,
      },
      query: querySignalSchema,
    },
  },
  async handler(request: QueryRequest, headers) {
    const { id, rule_id: ruleId } = request.query;
    const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
    const actionsClient = isFunction(request.getActionsClient) ? request.getActionsClient() : null;

    if (alertsClient == null || actionsClient == null) {
      return headers.response().code(404);
    }

    const signal = await deleteSignals({
      actionsClient,
      alertsClient,
      id,
      ruleId,
    });

    if (signal != null) {
      return transformOrError(signal);
    } else {
      return getIdError({ id, ruleId });
    }
  },
};

export const deleteSignalsRoute = (server: ServerFacade): void => {
  server.route(createDeleteSignalsRoute);
};
