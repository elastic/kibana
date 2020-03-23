/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extname } from 'path';
import { chunk, omit, set } from 'lodash/fp';
import {
  buildRouteValidation,
  buildSiemResponse,
  createBulkErrorObject,
  BulkError,
  transformError,
} from '../../detection_engine/routes/utils';

import { createTimelinesStreamFromNdJson } from '../create_timelines_stream_from_ndjson';
import { createPromiseFromStreams } from '../../../../../../../../src/legacy/utils';

import {
  createTimelines,
  getTupleDuplicateErrorsAndUniqueTimeline,
  isBulkError,
  isImportRegular,
  ImportTimelineResponse,
  ImportTimelinesRequestParams,
  ImportTimelinesSchema,
  PromiseFromStreams,
} from './utils/import_timelines';

import { IRouter } from '../../../../../../../../src/core/server';
import { IMPORT_TIMELINES_URL } from '../../../../common/constants';
import {
  importTimelinesQuerySchema,
  importTimelinesPayloadSchema,
} from './schemas/import_timelines_schema';
import { importRulesSchema } from '../../detection_engine/routes/schemas/response/import_rules_schema';
import { LegacyServices } from '../../../types';

import { Timeline } from '../saved_object';
import { validate } from '../../detection_engine/routes/rules/validate';
import { FrameworkRequest } from '../../framework';
import { SecurityPluginSetup } from '../../../../../../../plugins/security/server';

const CHUNK_PARSED_OBJECT_SIZE = 10;

const timelineLib = new Timeline();

export const importTimelinesRoute = (
  router: IRouter,
  config: LegacyServices['config'],
  securityPluginSetup: SecurityPluginSetup
) => {
  router.post(
    {
      path: `${IMPORT_TIMELINES_URL}`,
      validate: {
        query: buildRouteValidation<ImportTimelinesRequestParams['query']>(
          importTimelinesQuerySchema
        ),
        body: buildRouteValidation<ImportTimelinesRequestParams['body']>(
          importTimelinesPayloadSchema
        ),
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
      const siemResponse = buildSiemResponse(response);
      const savedObjectsClient = context.core.savedObjects.client;
      if (!savedObjectsClient) {
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
        const readStream = createTimelinesStreamFromNdJson(objectLimit);
        const parsedObjects = await createPromiseFromStreams<PromiseFromStreams[]>([
          request.body.file,
          ...readStream,
        ]);
        const [duplicateIdErrors, uniqueParsedObjects] = getTupleDuplicateErrorsAndUniqueTimeline(
          parsedObjects,
          request.query.overwrite
        );
        const chunkParseObjects = chunk(CHUNK_PARSED_OBJECT_SIZE, uniqueParsedObjects);
        let importTimelineResponse: ImportTimelineResponse[] = [];

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
                    } = parsedTimeline;
                    const parsedTimelineObject = omit(
                      [
                        'globalNotes',
                        'eventNotes',
                        'pinnedEventIds',
                        'version',
                        'savedObjectId',
                        'created',
                        'createdBy',
                        'updated',
                        'updatedBy',
                      ],
                      parsedTimeline
                    );
                    try {
                      const user = await securityPluginSetup.authc.getCurrentUser(request);
                      let frameworkRequest = set(
                        'context.core.savedObjects.client',
                        savedObjectsClient,
                        request
                      );
                      frameworkRequest = set('user', user, frameworkRequest);
                      let timeline = null;
                      try {
                        timeline = await timelineLib.getTimeline(
                          (frameworkRequest as unknown) as FrameworkRequest,
                          savedObjectId
                        );
                        // eslint-disable-next-line no-empty
                      } catch (e) {}

                      if (timeline == null) {
                        await createTimelines(
                          (frameworkRequest as unknown) as FrameworkRequest,
                          resolve,
                          parsedTimelineObject,
                          null, // timelineSavedObjectId
                          null, // timelineVersion
                          pinnedEventIds,
                          [...globalNotes, ...eventNotes],
                          [] // existing note ids
                        );
                      } else if (timeline != null && frameworkRequest.query.overwrite) {
                        // update timeline

                        await createTimelines(
                          (frameworkRequest as unknown) as FrameworkRequest,
                          resolve,
                          parsedTimelineObject,
                          timeline.savedObjectId,
                          timeline.version,
                          pinnedEventIds,
                          [...globalNotes, ...eventNotes],
                          timeline.noteIds
                        );
                      } else if (timeline != null) {
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

        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
