/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import {
  BulkUpdateRulesRequest,
  IRuleSavedAttributesSavedObjectAttributes,
} from '../../rules/types';
import { LegacyServices } from '../../../../types';
import { GetScopedClients } from '../../../../services';
import { transformOrBulkError, getIdBulkError } from './utils';
import { transformBulkError, getIndex } from '../utils';
import { updateRulesBulkSchema } from '../schemas/update_rules_bulk_schema';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';
import { updateRules } from '../../rules/update_rules';

export const createUpdateRulesBulkRoute = (
  config: LegacyServices['config'],
  getClients: GetScopedClients
): Hapi.ServerRoute => {
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
      const { actionsClient, alertsClient, savedObjectsClient, spacesClient } = await getClients(
        request
      );

      if (!actionsClient || !alertsClient) {
        return headers.response().code(404);
      }

      const rules = await Promise.all(
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
          const finalIndex = outputIndex ?? getIndex(spacesClient.getSpaceId, config);
          const idOrRuleIdOrUnknown = id ?? ruleId ?? '(unknown id)';
          try {
            const rule = await updateRules({
              alertsClient,
              actionsClient,
              description,
              enabled,
              immutable: false,
              falsePositives,
              from,
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

export const updateRulesBulkRoute = (
  route: LegacyServices['route'],
  config: LegacyServices['config'],
  getClients: GetScopedClients
): void => {
  route(createUpdateRulesBulkRoute(config, getClients));
};
