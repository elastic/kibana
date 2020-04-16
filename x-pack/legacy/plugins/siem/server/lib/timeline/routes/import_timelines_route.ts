/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extname } from 'path';
import { chunk, omit, set } from 'lodash/fp';

import {
  buildSiemResponse,
  createBulkErrorObject,
  BulkError,
  transformError,
} from '../../detection_engine/routes/utils';

import { createTimelinesStreamFromNdJson } from '../create_timelines_stream_from_ndjson';
import { createPromiseFromStreams } from '../../../../../../../../src/legacy/utils';

import {
  getTupleDuplicateErrorsAndUniqueTimeline,
  isBulkError,
  isImportRegular,
  ImportTimelineResponse,
  ImportTimelinesSchema,
  PromiseFromStreams,
  timelineSavedObjectOmittedFields,
} from './utils/import_timelines';
import { createTimelines, getTimeline } from './utils/create_timelines';

import { IRouter } from '../../../../../../../../src/core/server';
import { TIMELINE_IMPORT_URL } from '../../../../common/constants';
import { SetupPlugins } from '../../../plugin';
import { ImportTimelinesPayloadSchemaRt } from './schemas/import_timelines_schema';
import { importRulesSchema } from '../../detection_engine/routes/schemas/response/import_rules_schema';
import { LegacyServices } from '../../../types';

import { validate } from '../../detection_engine/routes/rules/validate';
import { FrameworkRequest } from '../../framework';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { createTemplateTimelines } from './utils/create_template_timelines';
import { TimelineType } from '../../../graphql/types';

const CHUNK_PARSED_OBJECT_SIZE = 10;

export const importTimelinesRoute = (
  router: IRouter,
  config: LegacyServices['config'],
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: `${TIMELINE_IMPORT_URL}`,
      validate: {
        body: buildRouteValidation(ImportTimelinesPayloadSchemaRt),
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
      try {
        const siemResponse = buildSiemResponse(response);
        const savedObjectsClient = context.core.savedObjects.client;
        if (!savedObjectsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const { file } = request.body;
        const { filename } = file.hapi;

        const fileExtension = extname(filename).toLowerCase();

        if (fileExtension !== '.ndjson') {
          return siemResponse.error({
            statusCode: 400,
            body: `Invalid file extension ${fileExtension}`,
          });
        }

        const objectLimit = config().get<number>('savedObjects.maxImportExportSize');

        const readStream = createTimelinesStreamFromNdJson(objectLimit);
        const parsedObjects = await createPromiseFromStreams<PromiseFromStreams[]>([
          file,
          ...readStream,
        ]);
        const [duplicateIdErrors, uniqueParsedObjects] = getTupleDuplicateErrorsAndUniqueTimeline(
          parsedObjects,
          false
        );
        const chunkParseObjects = chunk(CHUNK_PARSED_OBJECT_SIZE, uniqueParsedObjects);
        let importTimelineResponse: ImportTimelineResponse[] = [];

        const user = await security?.authc.getCurrentUser(request);
        let frameworkRequest = set('context.core.savedObjects.client', savedObjectsClient, request);
        frameworkRequest = set('user', user, frameworkRequest);

        while (chunkParseObjects.length) {
          const batchParseObjects = chunkParseObjects.shift() ?? [];
          const newImportTimelineResponse = await Promise.all(
            batchParseObjects.reduce<Array<Promise<ImportTimelineResponse>>>(
              (accum, parsedTimeline) => {
                const importsWorkerPromise = new Promise<ImportTimelineResponse>(
                  async (resolve, reject) => {
                    if (parsedTimeline instanceof Error) {
                      // If the JSON object had a validation or parse error then we return
                      // early with the error and an (unknown) for the ruleId
                      resolve(
                        createBulkErrorObject({
                          statusCode: 400,
                          message: parsedTimeline.message,
                        })
                      );

                      return null;
                    }
                    const {
                      savedObjectId,
                      pinnedEventIds,
                      globalNotes,
                      eventNotes,
                      timelineType,
                    } = parsedTimeline;
                    const parsedTimelineObject = omit(
                      timelineSavedObjectOmittedFields,
                      parsedTimeline
                    );
                    let newTimelineSavedObjectId = null;
                    try {
                      const timeline = await getTimeline(
                        (frameworkRequest as unknown) as FrameworkRequest,
                        savedObjectId
                      );

                      if (timeline == null) {
                        if (timelineType === TimelineType.template) {
                          newTimelineSavedObjectId = await createTemplateTimelines(
                            (frameworkRequest as unknown) as FrameworkRequest,
                            parsedTimelineObject
                          );
                        } else {
                          newTimelineSavedObjectId = await createTimelines(
                            (frameworkRequest as unknown) as FrameworkRequest,
                            parsedTimelineObject,
                            null, // timelineSavedObjectId
                            null, // timelineVersion
                            pinnedEventIds,
                            [...globalNotes, ...eventNotes],
                            [] // existing note ids
                          );
                        }

                        resolve({
                          timeline_id: newTimelineSavedObjectId,
                          status_code: 200,
                        });
                      } else {
                        resolve(
                          createBulkErrorObject({
                            id: savedObjectId,
                            statusCode: 409,
                            message: `timeline_id: "${savedObjectId}" already exists`,
                          })
                        );
                      }
                    } catch (err) {
                      resolve(
                        createBulkErrorObject({
                          id: savedObjectId,
                          statusCode: 400,
                          message: err.message,
                        })
                      );
                    }
                  }
                );
                return [...accum, importsWorkerPromise];
              },
              []
            )
          );
          importTimelineResponse = [
            ...duplicateIdErrors,
            ...importTimelineResponse,
            ...newImportTimelineResponse,
          ];
        }

        const errorsResp = importTimelineResponse.filter(resp => isBulkError(resp)) as BulkError[];
        const successes = importTimelineResponse.filter(resp => {
          if (isImportRegular(resp)) {
            return resp.status_code === 200;
          } else {
            return false;
          }
        });
        const importTimelines: ImportTimelinesSchema = {
          success: errorsResp.length === 0,
          success_count: successes.length,
          errors: errorsResp,
        };
        const [validated, errors] = validate(importTimelines, importRulesSchema);

        if (errors != null) {
          return siemResponse.error({ statusCode: 500, body: errors });
        } else {
          return response.ok({ body: validated ?? {} });
        }
      } catch (err) {
        const error = transformError(err);
        const siemResponse = buildSiemResponse(response);

        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
