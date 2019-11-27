/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';
import { DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';
import { getIdError, transformOrError } from './utils';

import { readRules } from '../alerts/read_rules';
import { ServerFacade } from '../../../types';
import { queryRulesSchema } from './schemas';
import { QueryRequest } from '../alerts/types';

export const createReadRulesRoute: Hapi.ServerRoute = {
  method: 'GET',
  path: DETECTION_ENGINE_RULES_URL,
  options: {
    tags: ['access:signals-all'],
    validate: {
      options: {
        abortEarly: false,
      },
      query: queryRulesSchema,
    },
  },
  async handler(request: QueryRequest, headers) {
    const { id, rule_id: ruleId } = request.query;
    const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
    const actionsClient = isFunction(request.getActionsClient) ? request.getActionsClient() : null;

    if (!alertsClient || !actionsClient) {
      return headers.response().code(404);
    }
    const rule = await readRules({
      alertsClient,
      id,
      ruleId,
    });
    if (rule != null) {
      return transformOrError(rule);
    } else {
      return getIdError({ id, ruleId });
    }
  },
};

export const readRulesRoute = (route: ServerFacade['route']) => {
  route(createReadRulesRoute);
};
