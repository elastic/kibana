/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { patchRules } from '../../rules/patch_rules';
import { PatchRulesRequest, IRuleSavedAttributesSavedObjectAttributes } from '../../rules/types';
import { patchRulesSchema } from '../schemas/patch_rules_schema';
import { LegacyServices } from '../../../../types';
import { GetScopedClients } from '../../../../services';
import { getIdError, transform } from './utils';
import { transformError } from '../utils';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';

export const createPatchRulesRoute = (getClients: GetScopedClients): Hapi.ServerRoute => {
  return {
    method: 'PATCH',
    path: DETECTION_ENGINE_RULES_URL,
    options: {
      tags: ['access:siem'],
      validate: {
        options: {
          abortEarly: false,
        },
        payload: patchRulesSchema,
      },
    },
    async handler(request: PatchRulesRequest, headers) {
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
      } = request.payload;

      try {
        const { alertsClient, actionsClient, savedObjectsClient } = await getClients(request);

        if (!actionsClient || !alertsClient) {
          return headers.response().code(404);
        }

        const rule = await patchRules({
          actionsClient,
          alertsClient,
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

export const patchRulesRoute = (route: LegacyServices['route'], getClients: GetScopedClients) => {
  route(createPatchRulesRoute(getClients));
};
