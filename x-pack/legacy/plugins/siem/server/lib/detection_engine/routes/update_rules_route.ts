/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';
import { DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';
import { updateRules } from '../alerts/update_rules';
import { UpdateRulesRequest } from '../alerts/types';
import { updateRulesSchema } from './schemas';
import { ServerFacade } from '../../../types';
import { getIdError, transformOrError, transformError } from './utils';

export const createUpdateRulesRoute: Hapi.ServerRoute = {
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
    } = request.payload;

    const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
    const actionsClient = isFunction(request.getActionsClient) ? request.getActionsClient() : null;

    if (!alertsClient || !actionsClient) {
      return headers.response().code(404);
    }

    try {
      const rule = await updateRules({
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
      });
      if (rule != null) {
        return transformOrError(rule);
      } else {
        return getIdError({ id, ruleId });
      }
    } catch (err) {
      return transformError(err);
    }
  },
};

export const updateRulesRoute = (server: ServerFacade) => {
  server.route(createUpdateRulesRoute);
};
