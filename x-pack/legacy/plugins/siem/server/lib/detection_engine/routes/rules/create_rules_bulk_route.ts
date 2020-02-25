/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { countBy } from 'lodash/fp';
import uuid from 'uuid';

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { GetScopedClients } from '../../../../services';
import { LegacyServices } from '../../../../types';
import { createRules } from '../../rules/create_rules';
import { BulkRulesRequest } from '../../rules/types';
import { readRules } from '../../rules/read_rules';
import { transformOrBulkError, getDuplicates } from './utils';
import { getIndexExists } from '../../index/get_index_exists';
import { getIndex, transformBulkError, createBulkErrorObject } from '../utils';
import { createRulesBulkSchema } from '../schemas/create_rules_bulk_schema';

export const createCreateRulesBulkRoute = (
  config: LegacyServices['config'],
  getClients: GetScopedClients
): Hapi.ServerRoute => {
  return {
    method: 'POST',
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_create`,
    options: {
      tags: ['access:siem'],
      validate: {
        options: {
          abortEarly: false,
        },
        payload: createRulesBulkSchema,
      },
    },
    async handler(request: BulkRulesRequest, headers) {
      const { actionsClient, alertsClient, clusterClient, spacesClient } = await getClients(
        request
      );

      if (!actionsClient || !alertsClient) {
        return headers.response().code(404);
      }

      const ruleDefinitions = request.payload;
      const mappedDuplicates = countBy('rule_id', ruleDefinitions);
      const dupes = getDuplicates(mappedDuplicates);

      const rules = await Promise.all(
        ruleDefinitions
          .filter(rule => rule.rule_id == null || !dupes.includes(rule.rule_id))
          .map(async payloadRule => {
            const {
              description,
              enabled,
              false_positives: falsePositives,
              from,
              query,
              language,
              output_index: outputIndex,
              saved_id: savedId,
              meta,
              filters,
              rule_id: ruleId,
              index,
              interval,
              max_signals: maxSignals,
              risk_score: riskScore,
              name,
              severity,
              tags,
              threat,
              to,
              type,
              references,
              timeline_id: timelineId,
              timeline_title: timelineTitle,
              version,
            } = payloadRule;
            const ruleIdOrUuid = ruleId ?? uuid.v4();
            try {
              const finalIndex = outputIndex ?? getIndex(spacesClient.getSpaceId, config);
              const indexExists = await getIndexExists(clusterClient.callAsCurrentUser, finalIndex);
              if (!indexExists) {
                return createBulkErrorObject({
                  ruleId: ruleIdOrUuid,
                  statusCode: 400,
                  message: `To create a rule, the index must exist first. Index ${finalIndex} does not exist`,
                });
              }
              if (ruleId != null) {
                const rule = await readRules({ alertsClient, ruleId });
                if (rule != null) {
                  return createBulkErrorObject({
                    ruleId,
                    statusCode: 409,
                    message: `rule_id: "${ruleId}" already exists`,
                  });
                }
              }
              const createdRule = await createRules({
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
                timelineId,
                timelineTitle,
                meta,
                filters,
                ruleId: ruleIdOrUuid,
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
              return transformOrBulkError(ruleIdOrUuid, createdRule);
            } catch (err) {
              return transformBulkError(ruleIdOrUuid, err);
            }
          })
      );
      return [
        ...rules,
        ...dupes.map(ruleId =>
          createBulkErrorObject({
            ruleId,
            statusCode: 409,
            message: `rule_id: "${ruleId}" already exists`,
          })
        ),
      ];
    },
  };
};

export const createRulesBulkRoute = (
  route: LegacyServices['route'],
  config: LegacyServices['config'],
  getClients: GetScopedClients
): void => {
  route(createCreateRulesBulkRoute(config, getClients));
};
