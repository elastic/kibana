/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { chunk, isEmpty } from 'lodash/fp';
import { extname } from 'path';

import { createPromiseFromStreams } from '../../../../../../../../../src/legacy/utils/streams';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { LegacyServices, LegacyRequest } from '../../../../types';
import { createRules } from '../../rules/create_rules';
import { ImportRulesRequest } from '../../rules/types';
import { readRules } from '../../rules/read_rules';
import { getIndexExists } from '../../index/get_index_exists';
import { getIndex, createBulkErrorObject, ImportRuleResponse } from '../utils';
import { createRulesStreamFromNdJson } from '../../rules/create_rules_stream_from_ndjson';
import { ImportRuleAlertRest } from '../../types';
import { patchRules } from '../../rules/patch_rules';
import { importRulesQuerySchema, importRulesPayloadSchema } from '../schemas/import_rules_schema';
import { getTupleDuplicateErrorsAndUniqueRules } from './utils';
import { GetScopedClients } from '../../../../services';

type PromiseFromStreams = ImportRuleAlertRest | Error;

const CHUNK_PARSED_OBJECT_SIZE = 10;

export const createImportRulesRoute = (
  config: LegacyServices['config'],
  getClients: GetScopedClients
): Hapi.ServerRoute => {
  return {
    method: 'POST',
    path: `${DETECTION_ENGINE_RULES_URL}/_import`,
    options: {
      tags: ['access:siem'],
      payload: {
        maxBytes: config().get('savedObjects.maxImportPayloadBytes'),
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
    async handler(request: ImportRulesRequest & LegacyRequest, headers) {
      const {
        actionsClient,
        alertsClient,
        clusterClient,
        spacesClient,
        savedObjectsClient,
      } = await getClients(request);

      if (!actionsClient || !alertsClient) {
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

      const objectLimit = config().get<number>('savedObjects.maxImportExportSize');
      const readStream = createRulesStreamFromNdJson(request.payload.file, objectLimit);
      const parsedObjects = await createPromiseFromStreams<PromiseFromStreams[]>([readStream]);
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
                      ruleId: '(unknown)',
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
                  const finalIndex = getIndex(spacesClient.getSpaceId, config);
                  const indexExists = await getIndexExists(
                    clusterClient.callAsCurrentUser,
                    finalIndex
                  );
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
    },
  };
};

export const importRulesRoute = (
  route: LegacyServices['route'],
  config: LegacyServices['config'],
  getClients: GetScopedClients
): void => {
  route(createImportRulesRoute(config, getClients));
};
