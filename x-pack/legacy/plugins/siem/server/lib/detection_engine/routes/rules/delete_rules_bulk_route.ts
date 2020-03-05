/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { LegacyServices } from '../../../../types';
import { GetScopedClients } from '../../../../services';
import { queryRulesBulkSchema } from '../schemas/query_rules_bulk_schema';
import { getIdBulkError } from './utils';
import { transformValidateBulkError, validate } from './validate';
import { transformBulkError } from '../utils';
import { QueryBulkRequest, IRuleSavedAttributesSavedObjectAttributes } from '../../rules/types';
import { deleteRules } from '../../rules/delete_rules';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';
import { rulesBulkSchema } from '../schemas/response/rules_bulk_schema';

export const createDeleteRulesBulkRoute = (getClients: GetScopedClients): Hapi.ServerRoute => {
  return {
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
      const { actionsClient, alertsClient, savedObjectsClient } = await getClients(request);

      if (!actionsClient || !alertsClient) {
        return headers.response().code(404);
      }
      const rules = await Promise.all(
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
              const ruleStatuses = await savedObjectsClient.find<
                IRuleSavedAttributesSavedObjectAttributes
              >({
                type: ruleStatusSavedObjectType,
                perPage: 6,
                search: rule.id,
                searchFields: ['alertId'],
              });
              ruleStatuses.saved_objects.forEach(async obj =>
                savedObjectsClient.delete(ruleStatusSavedObjectType, obj.id)
              );
              return transformValidateBulkError(idOrRuleIdOrUnknown, rule, ruleStatuses);
            } else {
              return getIdBulkError({ id, ruleId });
            }
          } catch (err) {
            return transformBulkError(idOrRuleIdOrUnknown, err);
          }
        })
      );
      const [validated, errors] = validate(rules, rulesBulkSchema);
      if (errors != null) {
        return headers
          .response({
            message: errors,
            status_code: 500,
          })
          .code(500);
      } else {
        return validated;
      }
    },
  };
};

export const deleteRulesBulkRoute = (
  route: LegacyServices['route'],
  getClients: GetScopedClients
): void => {
  route(createDeleteRulesBulkRoute(getClients));
};
