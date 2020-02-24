/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { UpdateRulesRequest, IRuleSavedAttributesSavedObjectAttributes } from '../../rules/types';
import { updateRulesSchema } from '../schemas/update_rules_schema';
import { ServerFacade } from '../../../../types';
import { getIdError, transform } from './utils';
import { transformError, getIndex } from '../utils';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';
import { updateRules } from '../../rules/update_rules';

export const createUpdateRulesRoute = (server: ServerFacade): Hapi.ServerRoute => {
  return {
    method: 'PUT',
    path: DETECTION_ENGINE_RULES_URL,
    options: {
      tags: ['access:siem'],
      validate: {
        options: {
          abortEarly: false,
        },
        payload: updateRulesSchema,
      },
    },
    async handler(request: UpdateRulesRequest, headers) {
      const {
        description,
        enabled,
        false_positives: falsePositives,
        from,
        query,
        language,
        output_index: outputIndex,
        saved_id: savedId,
        timeline_id: timelineId = null,
        timeline_title: timelineTitle = null,
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
      } = request.payload;

      const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
      const actionsClient = isFunction(request.getActionsClient)
        ? request.getActionsClient()
        : null;
      const savedObjectsClient = isFunction(request.getSavedObjectsClient)
        ? request.getSavedObjectsClient()
        : null;
      if (!alertsClient || !actionsClient || !savedObjectsClient) {
        return headers.response().code(404);
      }

      try {
        const finalIndex = outputIndex != null ? outputIndex : getIndex(request, server);
        const rule = await updateRules({
          alertsClient,
          actionsClient,
          description,
          enabled,
          falsePositives,
          from,
          immutable: false,
          query,
          language,
          outputIndex: finalIndex,
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
          const transformed = transform(rule, ruleStatuses.saved_objects[0]);
          if (transformed == null) {
            return headers
              .response({
                message: 'Internal error transforming rules',
                status_code: 500,
              })
              .code(500);
          } else {
            return transformed;
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
  };
};

export const updateRulesRoute = (server: ServerFacade) => {
  server.route(createUpdateRulesRoute(server));
};
