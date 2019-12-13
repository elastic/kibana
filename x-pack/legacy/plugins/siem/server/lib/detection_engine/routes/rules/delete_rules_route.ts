/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { deleteRules } from '../../rules/delete_rules';
import { ServerFacade } from '../../../../types';
import { queryRulesSchema } from '../schemas/query_rules_schema';
import { getIdError, transformOrError } from './utils';
import { transformError } from '../utils';
import { QueryRequest } from './types';

export const createDeleteRulesRoute: Hapi.ServerRoute = {
  method: 'DELETE',
  path: DETECTION_ENGINE_RULES_URL,
  options: {
    tags: ['access:siem'],
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

    if (alertsClient == null || actionsClient == null) {
      return headers.response().code(404);
    }

    try {
      const rule = await deleteRules({
        actionsClient,
        alertsClient,
        id,
        ruleId,
      });

      if (rule != null) {
        return transformOrError(rule);
      } else {
        return getIdError({ id, ruleId });
      }
    } catch (err) {
      return transformError(err);
    }
  },
};

export const deleteRulesRoute = (server: ServerFacade): void => {
  server.route(createDeleteRulesRoute);
};
