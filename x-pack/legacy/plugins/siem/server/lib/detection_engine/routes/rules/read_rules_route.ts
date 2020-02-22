/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { getIdError, transform } from './utils';
import { transformError } from '../utils';

import { readRules } from '../../rules/read_rules';
import { LegacyServices, LegacyRequest } from '../../../../types';
import { queryRulesSchema } from '../schemas/query_rules_schema';
import { QueryRequest, IRuleSavedAttributesSavedObjectAttributes } from '../../rules/types';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';
import { GetScopedClients } from '../../../../services';

export const createReadRulesRoute = (getClients: GetScopedClients): Hapi.ServerRoute => ({
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
  async handler(request: QueryRequest & LegacyRequest, headers) {
    const { id, rule_id: ruleId } = request.query;

    try {
      const { alertsClient, savedObjectsClient } = await getClients(request);
      if (!alertsClient) {
        return headers.response().code(404);
      }

      const rule = await readRules({
        alertsClient,
        id,
        ruleId,
      });
      if (rule != null) {
        const ruleStatuses = await savedObjectsClient.find<
          IRuleSavedAttributesSavedObjectAttributes
        >({
          type: ruleStatusSavedObjectType,
          perPage: 1,
          sortField: 'statusDate',
          sortOrder: 'desc',
          search: rule.id,
          searchFields: ['alertId'],
        });
        const transformedOrError = transform(rule, ruleStatuses.saved_objects[0]);
        if (transformedOrError == null) {
          return headers
            .response({
              message: 'Internal error transforming rules',
              status_code: 500,
            })
            .code(500);
        } else {
          return transformedOrError;
        }
      } else {
        const error = getIdError({ id, ruleId });
        return headers
          .response({
            message: error.message,
            status_code: error.statusCode,
          })
          .code(error.statusCode);
      }
    } catch (err) {
      const error = transformError(err);
      return headers
        .response({
          message: error.message,
          status_code: error.statusCode,
        })
        .code(error.statusCode);
    }
  },
});

export const readRulesRoute = (route: LegacyServices['route'], getClients: GetScopedClients) => {
  route(createReadRulesRoute(getClients));
};
