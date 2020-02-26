/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { chunk, isEmpty, isFunction } from 'lodash/fp';
import { extname } from 'path';
import { Readable } from 'stream';
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
  createBulkErrorObject,
  ImportRuleResponse,
  transformError,
} from '../utils';
import { createRulesStreamFromNdJson } from '../../rules/create_rules_stream_from_ndjson';
import { ImportRuleAlertRest } from '../../types';
import { patchRules } from '../../rules/patch_rules';
import { importRulesQuerySchema, importRulesPayloadSchema } from '../schemas/import_rules_schema';
import { getTupleDuplicateErrorsAndUniqueRules } from './utils';

type PromiseFromStreams = ImportRuleAlertRest | Error;

const CHUNK_PARSED_OBJECT_SIZE = 10;

export const createImportRulesRoute = (server: ServerFacade): Hapi.ServerRoute => {
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
        query: importRulesQuerySchema,
        payload: importRulesPayloadSchema,
      },
    },
    async handler(request: ImportRulesRequest, headers) {
      const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
      const actionsClient = isFunction(request.getActionsClient)
        ? request.getActionsClient()
        : null;
      const savedObjectsClient = isFunction(request.getSavedObjectsClient)
        ? request.getSavedObjectsClient()
        : null;
      if (!alertsClient || !actionsClient || !savedObjectsClient) {
        return headers.response().code(404);
      }
      const { filename } = request.payload.file.hapi;
      const fileExtension = extname(filename).toLowerCase();
      if (fileExtension !== '.ndjson') {
        return headers
          .response({
            message: `Invalid file extension ${fileExtension}`,
            status_code: 400,
          })
          .code(400);
      }

      const objectLimit = server.config().get<number>('savedObjects.maxImportExportSize');
      try {
        const readStream = createRulesStreamFromNdJson(objectLimit);
        const parsedObjects = await createPromiseFromStreams<PromiseFromStreams[]>([
          request.payload.file as Readable,
          ...readStream,
        ]);
        const [duplicateIdErrors, uniqueParsedObjects] = getTupleDuplicateErrorsAndUniqueRules(
          parsedObjects,
          request.query.overwrite
        );

        const chunkParseObjects = chunk(CHUNK_PARSED_OBJECT_SIZE, uniqueParsedObjects);
        let importRuleResponse: ImportRuleResponse[] = [];

        while (chunkParseObjects.length) {
          const batchParseObjects = chunkParseObjects.shift() ?? [];
          const newImportRuleResponse = await Promise.all(
            batchParseObjects.reduce<Array<Promise<ImportRuleResponse>>>((accum, parsedRule) => {
              const importsWorkerPromise = new Promise<ImportRuleResponse>(
                async (resolve, reject) => {
                  if (parsedRule instanceof Error) {
                    // If the JSON object had a validation or parse error then we return
                    // early with the error and an (unknown) for the ruleId
                    resolve(
                      createBulkErrorObject({
                        statusCode: 400,
                        message: parsedRule.message,
                      })
                    );
                    return null;
                  }
                  const {
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
                    threat,
                    to,
                    type,
                    references,
                    timeline_id: timelineId,
                    timeline_title: timelineTitle,
                    version,
                  } = parsedRule;
                  try {
                    const finalIndex = getIndex(request, server);
                    const callWithRequest = callWithRequestFactory(request, server);
                    const indexExists = await getIndexExists(callWithRequest, finalIndex);
                    if (!indexExists) {
                      resolve(
                        createBulkErrorObject({
                          ruleId,
                          statusCode: 409,
                          message: `To create a rule, the index must exist first. Index ${finalIndex} does not exist`,
                        })
                      );
                    }
                    const rule = await readRules({ alertsClient, ruleId });
                    if (rule == null) {
                      await createRules({
                        alertsClient,
                        actionsClient,
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
                        timelineTitle,
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
                        threat,
                        references,
                        version,
                      });
                      resolve({ rule_id: ruleId, status_code: 200 });
                    } else if (rule != null && request.query.overwrite) {
                      await patchRules({
                        alertsClient,
                        actionsClient,
                        savedObjectsClient,
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
                        timelineTitle,
                        meta,
                        filters,
                        id: undefined,
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
                      resolve({ rule_id: ruleId, status_code: 200 });
                    } else if (rule != null) {
                      resolve(
                        createBulkErrorObject({
                          ruleId,
                          statusCode: 409,
                          message: `rule_id: "${ruleId}" already exists`,
                        })
                      );
                    }
                  } catch (err) {
                    resolve(
                      createBulkErrorObject({
                        ruleId,
                        statusCode: 400,
                        message: err.message,
                      })
                    );
                  }
                }
              );
              return [...accum, importsWorkerPromise];
            }, [])
          );
          importRuleResponse = [
            ...duplicateIdErrors,
            ...importRuleResponse,
            ...newImportRuleResponse,
          ];
        }

        const errorsResp = importRuleResponse.filter(resp => !isEmpty(resp.error));
        return {
          success: errorsResp.length === 0,
          success_count: importRuleResponse.filter(resp => resp.status_code === 200).length,
          errors: errorsResp,
        };
      } catch (exc) {
        const error = transformError(exc);
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

export const importRulesRoute = (server: ServerFacade): void => {
  server.route(createImportRulesRoute(server));
};
