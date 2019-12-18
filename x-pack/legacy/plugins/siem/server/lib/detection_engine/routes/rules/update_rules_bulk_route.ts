/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { BulkUpdateRulesRequest } from '../../rules/types';
import { ServerFacade } from '../../../../types';
import { transformOrBulkError, getIdBulkError } from './utils';
import { transformBulkError } from '../utils';
import { updateRulesBulkSchema } from '../schemas/update_rules_bulk_schema';
import { updateRules } from '../../rules/update_rules';

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
      const actionsClient = isFunction(request.getActionsClient)
        ? request.getActionsClient()
        : null;

      if (!alertsClient || !actionsClient) {
        return headers.response().code(404);
      }

      const rules = Promise.all(
        request.payload.map(async payloadRule => {
          const {
            description,
            enabled,
            false_positives: falsePositives,
            from,
            immutable,
            query,
            language,
            output_index: outputIndex,
            saved_id: savedId,
            timeline_id: timelineId,
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
            threats,
            references,
            version,
          } = payloadRule;
          const idOrRuleIdOrUnknown = id ?? ruleId ?? 'unknown rule id';
          try {
            const rule = await updateRules({
              alertsClient,
              actionsClient,
              description,
              enabled,
              falsePositives,
              from,
              immutable,
              query,
              language,
              outputIndex,
              savedId,
              timelineId,
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
              threats,
              references,
              version,
            });
            if (rule != null) {
              return transformOrBulkError(rule.id, rule);
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
