/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';
import Boom from 'boom';
import uuid from 'uuid';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { createRules } from '../../rules/create_rules';
import { RulesRequest, IRuleSavedAttributesSavedObjectAttributes } from '../../rules/types';
import { createRulesSchema } from '../schemas/create_rules_schema';
import { ServerFacade } from '../../../../types';
import { readRules } from '../../rules/read_rules';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';
import { transformOrError } from './utils';
import { getIndexExists } from '../../index/get_index_exists';
import { callWithRequestFactory, getIndex, transformError } from '../utils';
import { KibanaRequest } from '../../../../../../../../../src/core/server';

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
      } = request.payload;
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

      try {
        const finalIndex = outputIndex != null ? outputIndex : getIndex(request, server);
        const callWithRequest = callWithRequestFactory(request, server);
        const indexExists = await getIndexExists(callWithRequest, finalIndex);
        if (!indexExists) {
          return Boom.badRequest(
            `To create a rule, the index must exist first. Index ${finalIndex} does not exist`
          );
        }
        if (ruleId != null) {
          const rule = await readRules({ alertsClient, ruleId });
          if (rule != null) {
            return Boom.conflict(`rule_id: "${ruleId}" already exists`);
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
          ruleId: ruleId ?? uuid.v4(),
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
          version: 1,
        });
        const ruleStatuses = await savedObjectsClient.find<
          IRuleSavedAttributesSavedObjectAttributes
        >({
          type: ruleStatusSavedObjectType,
          perPage: 1,
          sortField: 'statusDate',
          sortOrder: 'desc',
          search: `${createdRule.id}`,
          searchFields: ['alertId'],
        });
        return transformOrError(createdRule, ruleStatuses.saved_objects[0]);
      } catch (err) {
        return transformError(err);
      }
    },
  };
};

export const createRulesRoute = (server: ServerFacade): void => {
  server.route(createCreateRulesRoute(server));
};
