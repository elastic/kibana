/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import Hapi from 'hapi';
import Joi from 'joi';
import { extname } from 'path';
import { isFunction } from 'lodash/fp';
import uuid from 'uuid';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { createRules } from '../../rules/create_rules';
import { ImportRulesRequest } from '../../rules/types';
import { ServerFacade } from '../../../../types';
import { readRules } from '../../rules/read_rules';
import { transformOrBulkError } from './utils';
import { getIndexExists } from '../../index/get_index_exists';
import {
  callWithRequestFactory,
  getIndex,
  transformBulkError,
  createBulkErrorObject,
} from '../utils';
import { createRulesStreamFromNdJson } from '../../rules/create_rules_stream_from_ndjson';
import { collectRulesObjects } from '../../rules/collect_rules_objects';

export const createImportRulesBulkRoute = (server: ServerFacade): Hapi.ServerRoute => {
  return {
    method: 'POST',
    path: `${DETECTION_ENGINE_RULES_URL}/_import`,
    options: {
      tags: ['access:siem'],
      payload: {
        maxBytes: server.config().get('savedObjects.maxImportPayloadBytes'),
        output: 'stream',
        allow: 'multipart/form-data',
      },
      validate: {
        options: {
          abortEarly: false,
        },
        query: Joi.object()
          .keys({
            overwrite: Joi.boolean().default(false),
          })
          .default(),
        payload: Joi.object({
          file: Joi.object().required(),
        }).default(),
        // payload: createRulesBulkSchema, // TODO: Change this out to be a set of JSON documents if possible
      },
    },
    async handler(request: ImportRulesRequest, headers) {
      const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
      const actionsClient = isFunction(request.getActionsClient)
        ? request.getActionsClient()
        : null;

      if (!alertsClient || !actionsClient) {
        return headers.response().code(404);
      }
      const { filename } = request.payload.file.hapi;
      const fileExtension = extname(filename).toLowerCase();
      if (fileExtension !== '.ndjson') {
        return Boom.badRequest(`Invalid file extension ${fileExtension}`);
      }

      console.log('YOLO, I AM HERE RETURNING THE PAYLOAD');
      try {
        const objectLimit = server.config().get<number>('savedObjects.maxImportExportSize');
        const readStream = createRulesStreamFromNdJson(request.payload.file);

        // TODO: Add overwrite
        // const overwrite = request.query.overwrite;
        const ruleObjects = collectRulesObjects({ readStream, objectLimit });
        const parsedObjects = (await ruleObjects).collectedObjects;
        const parsedErrors = (await ruleObjects).errors;
        console.log('Parsed objects are: ---->', JSON.stringify(parsedObjects, null, 2));
        const moreStuff = Promise.all(
          parsedObjects.map(async parsedRule => {
            const {
              created_at: createdAt,
              description,
              enabled,
              false_positives: falsePositives,
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
              updated_at: updatedAt,
              references,
              timeline_id: timelineId,
              version,
            } = parsedRule;
            // TODO: Change RuleAlertParamsRest for a better Type so we have created_at, created_by, etc... and ruleId is not null
            try {
              const finalIndex = outputIndex != null ? outputIndex : getIndex(request, server);
              const callWithRequest = callWithRequestFactory(request, server);
              const indexExists = await getIndexExists(callWithRequest, finalIndex);
              if (!indexExists) {
                return createBulkErrorObject({
                  ruleId: ruleIdOrUuid,
                  statusCode: 409,
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
                createdAt,
                description,
                enabled,
                falsePositives,
                from,
                immutable,
                query,
                language,
                outputIndex: finalIndex,
                savedId,
                timelineId,
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
                threats,
                updatedAt,
                references,
                version,
              });
              return transformOrBulkError(ruleIdOrUuid, createdRule);
            } catch (err) {
              return transformBulkError(ruleIdOrUuid, err);
            }
          })
        );
        return {
          success: parsedObjects.length,
          errors: parsedErrors,
        };
      } catch (err) {
        console.log('I AM IN ERR:', err);
        // TODO: Change the error reporting
        return transformBulkError('TODO: Change this', err);
      }
      const rules = Promise.all(
        request.payload.map(async payloadRule => {
          const {
            created_at: createdAt,
            description,
            enabled,
            false_positives: falsePositives,
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
            updated_at: updatedAt,
            references,
            timeline_id: timelineId,
            version,
          } = payloadRule;
          const ruleIdOrUuid = ruleId ?? uuid.v4();
          try {
            const finalIndex = outputIndex != null ? outputIndex : getIndex(request, server);
            const callWithRequest = callWithRequestFactory(request, server);
            const indexExists = await getIndexExists(callWithRequest, finalIndex);
            if (!indexExists) {
              return createBulkErrorObject({
                ruleId: ruleIdOrUuid,
                statusCode: 409,
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
              createdAt,
              description,
              enabled,
              falsePositives,
              from,
              immutable,
              query,
              language,
              outputIndex: finalIndex,
              savedId,
              timelineId,
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
              threats,
              updatedAt,
              references,
              version,
            });
            return transformOrBulkError(ruleIdOrUuid, createdRule);
          } catch (err) {
            return transformBulkError(ruleIdOrUuid, err);
          }
        })
      );
      return rules;
    },
  };
};

export const importRulesBulkRoute = (server: ServerFacade): void => {
  server.route(createImportRulesBulkRoute(server));
};
