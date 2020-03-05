/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { chunk } from 'lodash/fp';
import { extname } from 'path';

import { IRouter } from '../../../../../../../../../src/core/server';
import { createPromiseFromStreams } from '../../../../../../../../../src/legacy/utils/streams';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { LegacyServices } from '../../../../types';
import { createRules } from '../../rules/create_rules';
import { ImportRulesRequestParams } from '../../rules/types';
import { readRules } from '../../rules/read_rules';
import { getIndexExists } from '../../index/get_index_exists';
import {
  buildRouteValidation,
  createBulkErrorObject,
  ImportRuleResponse,
  BulkError,
  isBulkError,
  isImportRegular,
  transformError,
  buildSiemResponse,
} from '../utils';
import { createRulesStreamFromNdJson } from '../../rules/create_rules_stream_from_ndjson';
import { ImportRuleAlertRest } from '../../types';
import { patchRules } from '../../rules/patch_rules';
import { importRulesQuerySchema, importRulesPayloadSchema } from '../schemas/import_rules_schema';
import { ImportRulesSchema, importRulesSchema } from '../schemas/response/import_rules_schema';
import { getTupleDuplicateErrorsAndUniqueRules } from './utils';
import { validate } from './validate';

type PromiseFromStreams = ImportRuleAlertRest | Error;

const CHUNK_PARSED_OBJECT_SIZE = 10;

export const importRulesRoute = (router: IRouter, config: LegacyServices['config']) => {
  router.post(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_import`,
      validate: {
        query: buildRouteValidation<ImportRulesRequestParams['query']>(importRulesQuerySchema),
        body: buildRouteValidation<ImportRulesRequestParams['body']>(importRulesPayloadSchema),
      },
      options: {
        tags: ['access:siem'],
        body: {
          maxBytes: config().get('savedObjects.maxImportPayloadBytes'),
          output: 'stream',
        },
      },
    },
    async (context, request, response) => {
      const alertsClient = context.alerting.getAlertsClient();
      const actionsClient = context.actions.getActionsClient();
      const clusterClient = context.core.elasticsearch.dataClient;
      const savedObjectsClient = context.core.savedObjects.client;
      const siemClient = context.siem.getSiemClient();
      const siemResponse = buildSiemResponse(response);

      if (!actionsClient || !alertsClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      const { filename } = request.body.file.hapi;
      const fileExtension = extname(filename).toLowerCase();
      if (fileExtension !== '.ndjson') {
        return siemResponse.error({
          statusCode: 400,
          body: `Invalid file extension ${fileExtension}`,
        });
      }

      const objectLimit = config().get<number>('savedObjects.maxImportExportSize');
      try {
        const readStream = createRulesStreamFromNdJson(objectLimit);
        const parsedObjects = await createPromiseFromStreams<PromiseFromStreams[]>([
          request.body.file,
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
                    const signalsIndex = siemClient.signalsIndex;
                    const indexExists = await getIndexExists(
                      clusterClient.callAsCurrentUser,
                      signalsIndex
                    );
                    if (!indexExists) {
                      resolve(
                        createBulkErrorObject({
                          ruleId,
                          statusCode: 409,
                          message: `To create a rule, the index must exist first. Index ${signalsIndex} does not exist`,
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
                        outputIndex: signalsIndex,
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

        const errorsResp = importRuleResponse.filter(resp => isBulkError(resp)) as BulkError[];
        const successes = importRuleResponse.filter(resp => {
          if (isImportRegular(resp)) {
            return resp.status_code === 200;
          } else {
            return false;
          }
        });
        const importRules: ImportRulesSchema = {
          success: errorsResp.length === 0,
          success_count: successes.length,
          errors: errorsResp,
        };
        const [validated, errors] = validate(importRules, importRulesSchema);
        if (errors != null) {
          return siemResponse.error({ statusCode: 500, body: errors });
        } else {
          return response.ok({ body: validated ?? {} });
        }
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
