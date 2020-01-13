/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { ServerFacade } from '../../../../types';
import { findRulesStatusesSchema } from '../schemas/find_rules_statuses_schema';
import {
  FindRulesStatusesRequest,
  IRuleSavedAttributesSavedObjectAttributes,
} from '../../rules/types';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';

export const createFindRulesStatusRoute: Hapi.ServerRoute = {
  method: 'GET',
  path: `${DETECTION_ENGINE_RULES_URL}/_find_statuses`,
  options: {
    tags: ['access:siem'],
    validate: {
      options: {
        abortEarly: false,
      },
      query: findRulesStatusesSchema,
    },
  },
  async handler(request: FindRulesStatusesRequest, headers) {
    const { query } = request;
    const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
    const actionsClient = isFunction(request.getActionsClient) ? request.getActionsClient() : null;
    const savedObjectsClient = isFunction(request.getSavedObjectsClient)
      ? request.getSavedObjectsClient()
      : null;
    if (!alertsClient || !actionsClient || !savedObjectsClient) {
      return headers.response().code(404);
    }

    // build return object with ids as keys and errors as values.
    /* looks like this
        { 
            "someAlertId": [{"myerrorobject": "some error value"}, etc..],
            "anotherAlertId": ...
        }
    */
    const statuses = await query.ids.reduce(async (acc, id) => {
      const lastFiveErrorsForId = await savedObjectsClient.find<
        IRuleSavedAttributesSavedObjectAttributes
      >({
        type: ruleStatusSavedObjectType,
        perPage: 10,
        search: `"${id}"`,
        searchFields: ['alertId'],
      });
      lastFiveErrorsForId.saved_objects.sort((a, b) => {
        const dateA = new Date(a.attributes.statusDate);
        const dateB = new Date(b.attributes.statusDate);
        if (dateA < dateB) {
          return 1;
        } else if (dateA === dateB) {
          return 0;
        }
        return -1;
      });
      return {
        ...(await acc),
        [id]: lastFiveErrorsForId.saved_objects.map(errorItem => errorItem.attributes),
      };
    }, {});
    return statuses;
  },
};

export const findRulesStatusesRoute = (server: ServerFacade): void => {
  server.route(createFindRulesStatusRoute);
};
