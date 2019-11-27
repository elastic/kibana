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
import { transformOrError, transformError } from './utils';

export const createCreateRulesRoute: Hapi.ServerRoute = {
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
      to,
      type,
      references,
    } = request.payload;

    const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
    const actionsClient = isFunction(request.getActionsClient) ? request.getActionsClient() : null;

    if (!alertsClient || !actionsClient) {
      return headers.response().code(404);
    }

    try {
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
        outputIndex,
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
        references,
      });
      return transformOrError(createdRule);
    } catch (err) {
      return transformError(err);
    }
  },
};

export const createRulesRoute = (server: ServerFacade) => {
  server.route(createCreateRulesRoute);
};
