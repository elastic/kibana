/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';
import { DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';
import { findRules } from '../alerts/find_rules';
import { FindSignalsRequest } from '../alerts/types';
import { findRulesSchema } from './schemas';
import { ServerFacade } from '../../../types';
import { transformFindAlertsOrError } from './utils';

export const createFindRulesRoute: Hapi.ServerRoute = {
  method: 'GET',
  path: `${DETECTION_ENGINE_RULES_URL}/_find`,
  options: {
    tags: ['access:signals-all'],
    validate: {
      options: {
        abortEarly: false,
      },
      query: findRulesSchema,
    },
  },
  async handler(request: FindSignalsRequest, headers) {
    const { query } = request;
    const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
    const actionsClient = isFunction(request.getActionsClient) ? request.getActionsClient() : null;

    if (!alertsClient || !actionsClient) {
      return headers.response().code(404);
    }

    const signals = await findRules({
      alertsClient,
      perPage: query.per_page,
      page: query.page,
      sortField: query.sort_field,
      sortOrder: query.sort_order,
      filter: query.filter,
    });
    return transformFindAlertsOrError(signals);
  },
};

export const findRulesRoute = (server: ServerFacade) => {
  server.route(createFindRulesRoute);
};
