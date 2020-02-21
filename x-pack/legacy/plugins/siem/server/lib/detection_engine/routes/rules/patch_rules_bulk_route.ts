/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import {
  BulkPatchRulesRequest,
  IRuleSavedAttributesSavedObjectAttributes,
} from '../../rules/types';
import { LegacyServices } from '../../../../types';
import { GetScopedClients } from '../../../../services';
import { transformOrBulkError, getIdBulkError } from './utils';
import { transformBulkError } from '../utils';
import { patchRulesBulkSchema } from '../schemas/patch_rules_bulk_schema';
import { patchRules } from '../../rules/patch_rules';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';

export const createPatchRulesBulkRoute = (getClients: GetScopedClients): Hapi.ServerRoute => {
  return {
    method: 'PATCH',
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
    options: {
      tags: ['access:siem'],
      validate: {
        options: {
          abortEarly: false,
        },
        payload: patchRulesBulkSchema,
      },
    },
    async handler(request: BulkPatchRulesRequest, headers) {
      const { actionsClient, alertsClient, savedObjectsClient } = await getClients(request);

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
          const idOrRuleIdOrUnknown = id ?? ruleId ?? '(unknown id)';
          try {
            const rule = await patchRules({
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

export const patchRulesBulkRoute = (
  route: LegacyServices['route'],
  getClients: GetScopedClients
): void => {
  route(createPatchRulesBulkRoute(getClients));
};
