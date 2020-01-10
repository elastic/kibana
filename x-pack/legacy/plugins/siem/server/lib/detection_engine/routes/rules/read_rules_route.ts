/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { getIdError, transformOrError } from './utils';
import { transformError } from '../utils';

import { readRules } from '../../rules/read_rules';
import { ServerFacade } from '../../../../types';
import { queryRulesSchema } from '../schemas/query_rules_schema';
import { QueryRequest } from '../../rules/types';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';

export const createReadRulesRoute: Hapi.ServerRoute = {
  method: 'GET',
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
    const savedObjectsClient = isFunction(request.getSavedObjectsClient)
      ? request.getSavedObjectsClient()
      : null;
    if (!alertsClient || !actionsClient || !savedObjectsClient) {
      return headers.response().code(404);
    }
    try {
      const rule = await readRules({
        alertsClient,
        id,
        ruleId,
      });
      const ruleStatuses = await savedObjectsClient.find({
        type: ruleStatusSavedObjectType,
        perPage: 10,
        search: `"${id}"`,
        searchFields: ['alertId'],
      });
      ruleStatuses.saved_objects.sort((a, b) => {
        const dateA = new Date(a.attributes.statusDate);
        const dateB = new Date(b.attributes.statusDate);
        if (dateA < dateB) {
          return 1;
        } else if (dateA === dateB) {
          return 0;
        }
        return -1;
      });
      if (rule != null) {
        return transformOrError(rule, ruleStatuses); // update this to run with an array of rule statuses
      } else {
        return getIdError({ id, ruleId });
      }
    } catch (err) {
      return transformError(err);
    }
  },
};

export const readRulesRoute = (server: ServerFacade) => {
  server.route(createReadRulesRoute);
};
