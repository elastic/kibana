/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { findRules } from '../../rules/find_rules';
import { FindRulesRequest } from '../../rules/types';
import { findRulesSchema } from '../schemas/find_rules_schema';
import { ServerFacade } from '../../../../types';
import { transformFindAlertsOrError } from './utils';
import { transformError } from '../utils';

export const createFindRulesRoute: Hapi.ServerRoute = {
  method: 'GET',
  path: `${DETECTION_ENGINE_RULES_URL}/_find`,
  options: {
    tags: ['access:siem'],
    validate: {
      options: {
        abortEarly: false,
      },
      query: findRulesSchema,
    },
  },
  async handler(request: FindRulesRequest, headers) {
    const { query } = request;
    const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
    const actionsClient = isFunction(request.getActionsClient) ? request.getActionsClient() : null;

    if (!alertsClient || !actionsClient) {
      return headers.response().code(404);
    }

    try {
      const rules = await findRules({
        alertsClient,
        perPage: query.per_page,
        page: query.page,
        sortField: query.sort_field,
        sortOrder: query.sort_order,
        filter: query.filter,
      });
      return transformFindAlertsOrError(rules);
    } catch (err) {
      return transformError(err);
    }
  },
};

export const findRulesRoute = (server: ServerFacade) => {
  server.route(createFindRulesRoute);
};
