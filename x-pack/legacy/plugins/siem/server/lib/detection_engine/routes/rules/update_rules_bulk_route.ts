/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import {
  BulkUpdateRulesRequest,
  IRuleSavedAttributesSavedObjectAttributes,
} from '../../rules/types';
import { ServerFacade } from '../../../../types';
import { transformOrBulkError, getIdBulkError } from './utils';
import { transformBulkError } from '../utils';
import { updateRulesBulkSchema } from '../schemas/update_rules_bulk_schema';
import { updateRules } from '../../rules/update_rules';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';
import { KibanaRequest } from '../../../../../../../../../src/core/server';

export const createUpdateRulesBulkRoute = (server: ServerFacade): Hapi.ServerRoute => {
  return {
    method: 'PUT',
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
    options: {
      tags: ['access:siem'],
      validate: {
        options: {
          abortEarly: false,
        },
        payload: updateRulesBulkSchema,
      },
    },
    async handler(request: BulkUpdateRulesRequest, headers) {
      const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
      const actionsClient = await server.plugins.actions.getActionsClientWithRequest(
        KibanaRequest.from((request as unknown) as Hapi.Request)
      );
      const savedObjectsClient = isFunction(request.getSavedObjectsClient)
        ? request.getSavedObjectsClient()
        : null;
      if (!alertsClient || !savedObjectsClient) {
        return headers.response().code(404);
      }

      const rules = Promise.all(
        request.payload.map(async payloadRule => {
          const {
            description,
            enabled,
            false_positives: falsePositives,
            from,
            query,
            language,
            output_index: outputIndex,
            saved_id: savedId,
            timeline_id: timelineId,
            timeline_title: timelineTitle,
            meta,
            filters,
            rule_id: ruleId,
            id,
            index,
            interval,
            max_signals: maxSignals,
            risk_score: riskScore,
            name,
            severity,
            tags,
            to,
            type,
            threat,
            references,
            version,
          } = payloadRule;
          const idOrRuleIdOrUnknown = id ?? ruleId ?? '(unknown id)';
          try {
            const rule = await updateRules({
              alertsClient,
              actionsClient,
              description,
              enabled,
              falsePositives,
              from,
              query,
              language,
              outputIndex,
              savedId,
              savedObjectsClient,
              timelineId,
              timelineTitle,
              meta,
              filters,
              id,
              ruleId,
              index,
              interval,
              maxSignals,
              riskScore,
              name,
              severity,
              tags,
              to,
              type,
              threat,
              references,
              version,
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
              return transformOrBulkError(rule.id, rule, ruleStatuses.saved_objects[0]);
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
};

export const updateRulesBulkRoute = (server: ServerFacade): void => {
  server.route(createUpdateRulesBulkRoute(server));
};
