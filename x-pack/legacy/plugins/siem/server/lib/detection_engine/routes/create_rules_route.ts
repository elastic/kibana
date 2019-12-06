/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';
import Boom from 'boom';
import uuid from 'uuid';
import { DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';
import { createRules } from '../alerts/create_rules';
import { RulesRequest } from '../alerts/types';
import { createRulesSchema } from './schemas';
import { ServerFacade } from '../../../types';
import { readRules } from '../alerts/read_rules';
import { transformOrError, transformError, getIndex, callWithRequestFactory } from './utils';
import { getIndexExists } from '../index/get_index_exists';

export const createCreateRulesRoute = (server: ServerFacade): Hapi.ServerRoute => {
  return {
    method: 'POST',
    path: DETECTION_ENGINE_RULES_URL,
    options: {
      tags: ['access:siem'],
      validate: {
        options: {
          abortEarly: false,
        },
        payload: createRulesSchema,
      },
    },
    async handler(request: RulesRequest, headers) {
      const {
        description,
        enabled,
        false_positives: falsePositives,
        filter,
        from,
        immutable,
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
        threats,
        to,
        type,
        references,
      } = request.payload;
      const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
      const actionsClient = isFunction(request.getActionsClient)
        ? request.getActionsClient()
        : null;

      if (!alertsClient || !actionsClient) {
        return headers.response().code(404);
      }

      try {
        const finalIndex = outputIndex != null ? outputIndex : getIndex(request, server);
        const callWithRequest = callWithRequestFactory(request);
        const indexExists = await getIndexExists(callWithRequest, finalIndex);
        if (!indexExists) {
          return new Boom(
            `To create a rule, the index must exist first. Index ${finalIndex} does not exist`,
            {
              statusCode: 400,
            }
          );
        }
        if (ruleId != null) {
          const rule = await readRules({ alertsClient, ruleId });
          if (rule != null) {
            return new Boom(`rule_id ${ruleId} already exists`, { statusCode: 409 });
          }
        }
        const createdRule = await createRules({
          alertsClient,
          actionsClient,
          description,
          enabled,
          falsePositives,
          filter,
          from,
          immutable,
          query,
          language,
          outputIndex: finalIndex,
          savedId,
          meta,
          filters,
          ruleId: ruleId != null ? ruleId : uuid.v4(),
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
        });
        return transformOrError(createdRule);
      } catch (err) {
        return transformError(err);
      }
    },
  };
};

export const createRulesRoute = (server: ServerFacade) => {
  server.route(createCreateRulesRoute(server));
};
