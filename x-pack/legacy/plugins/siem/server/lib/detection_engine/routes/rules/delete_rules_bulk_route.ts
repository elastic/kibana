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
import { queryRulesBulkSchema } from '../schemas/query_rules_bulk_schema';
import { transformOrBulkError, getIdBulkError } from './utils';
import { transformBulkError } from '../utils';
import { QueryBulkRequest } from '../../rules/types';

export const createDeleteRulesBulkRoute: Hapi.ServerRoute = {
  method: ['POST', 'DELETE'], // allow both POST and DELETE in case their client does not support bodies in DELETE
  path: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
  options: {
    tags: ['access:siem'],
    validate: {
      options: {
        abortEarly: false,
      },
      payload: queryRulesBulkSchema,
    },
  },
  async handler(request: QueryBulkRequest, headers) {
    const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
    const actionsClient = isFunction(request.getActionsClient) ? request.getActionsClient() : null;

    if (alertsClient == null || actionsClient == null) {
      return headers.response().code(404);
    }
    const rules = Promise.all(
      request.payload.map(async payloadRule => {
        const { id, rule_id: ruleId } = payloadRule;
        const idOrRuleIdOrUnknown = id ?? ruleId ?? '(unknown id)';
        try {
          const rule = await deleteRules({
            actionsClient,
            alertsClient,
            id,
            ruleId,
          });

          if (rule != null) {
            return transformOrBulkError(idOrRuleIdOrUnknown, rule);
          } else {
            return getIdBulkError({ id, ruleId });
          }
        } catch (err) {
          return transformBulkError(idOrRuleIdOrUnknown, err);
        }
      })
    );
    return rules;
  },
};

export const deleteRulesBulkRoute = (server: ServerFacade): void => {
  server.route(createDeleteRulesBulkRoute);
};
