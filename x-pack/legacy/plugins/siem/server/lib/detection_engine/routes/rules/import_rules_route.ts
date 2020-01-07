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
import { createPromiseFromStreams } from '../../../../../../../../../src/legacy/utils/streams';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { createRules } from '../../rules/create_rules';
import { ImportRulesRequest } from '../../rules/types';
import { ServerFacade } from '../../../../types';
import { readRules } from '../../rules/read_rules';
import { getIndexExists } from '../../index/get_index_exists';
import {
  callWithRequestFactory,
  getIndex,
  createImportErrorObject,
  transformImportError,
  ImportSuccessError,
} from '../utils';
import { createRulesStreamFromNdJson } from '../../rules/create_rules_stream_from_ndjson';
import { ImportRuleAlertRest } from '../../types';
import { transformOrImportError } from './utils';
import { updateRules } from '../../rules/update_rules';

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

      const objectLimit = server.config().get<number>('savedObjects.maxImportExportSize');
      const readStream = createRulesStreamFromNdJson(request.payload.file, objectLimit);
      const parsedObjects = await createPromiseFromStreams<[ImportRuleAlertRest | Error]>([
        readStream,
      ]);

      const reduced = await parsedObjects.reduce<Promise<ImportSuccessError>>(
        async (accum, parsedRule) => {
          const existingImportSuccessError = await accum;
          if (parsedRule instanceof Error) {
            // If the JSON object had a validation or parse error then we return
            // early with the error and an (unknown) for the ruleId
            return createImportErrorObject({
              ruleId: '(unknown)',
              statusCode: 400,
              message: parsedRule.message,
              existingImportSuccessError,
            });
          }

          const {
            id,
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
          try {
            const finalIndex = outputIndex != null ? outputIndex : getIndex(request, server);
            const callWithRequest = callWithRequestFactory(request, server);
            const indexExists = await getIndexExists(callWithRequest, finalIndex);
            if (!indexExists) {
              return createImportErrorObject({
                ruleId,
                statusCode: 409,
                message: `To create a rule, the index must exist first. Index ${finalIndex} does not exist`,
                existingImportSuccessError,
              });
            }
            const rule = await readRules({ alertsClient, id, ruleId });
            if (rule == null) {
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
                updatedAt,
                references,
                version,
              });
              return transformOrImportError(ruleId, createdRule, existingImportSuccessError);
            } else if (rule != null && request.query.overwrite) {
              const updatedRule = await updateRules({
                alertsClient,
                actionsClient,
                description,
                enabled,
                falsePositives,
                from,
                immutable,
                query,
                language,
                outputIndex,
                savedId,
                timelineId,
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
                version,
              });
              return transformOrImportError(ruleId, updatedRule, existingImportSuccessError);
            } else {
              return existingImportSuccessError;
            }
          } catch (err) {
            return transformImportError(ruleId, err, existingImportSuccessError);
          }
        },
        Promise.resolve({
          success: true,
          success_count: 0,
          errors: [],
        })
      );
      return reduced;
    },
  };
};

export const importRulesBulkRoute = (server: ServerFacade): void => {
  server.route(createImportRulesBulkRoute(server));
};
