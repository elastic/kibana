/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extname } from 'path';
import { chunk, omit, set, difference } from 'lodash/fp';
import {
  buildRouteValidation,
  buildSiemResponse,
  createBulkErrorObject,
  isBulkError,
  BulkError,
  isImportRegular,
  transformError,
} from '../../detection_engine/routes/utils';

import { createTimelinesStreamFromNdJson } from '../create_timelines_stream_from_ndjson';
import { createPromiseFromStreams } from '../../../../../../../../src/legacy/utils';
import { ExportedTimelines } from '../types';
import { getTupleDuplicateErrorsAndUniqueRules } from '../../detection_engine/routes/rules/utils';

import {
  savePinnedEvents,
  getCollectErrorMessages,
  getTupleDuplicateErrorsAndUniqueTimeline,
  saveTimelines,
  saveNotes,
} from './utils/import_timelines';

import { HapiReadableStream } from '../../detection_engine/rules/types';
import { IRouter } from '../../../../../../../../src/core/server';
import { IMPORT_TIMELINES_URL } from '../../../../common/constants';
import {
  importTimelinesQuerySchema,
  importTimelinesPayloadSchema,
} from './schemas/import_timelines_schema';
import { importRulesSchema } from '../../detection_engine/routes/schemas/response/import_rules_schema';
import { LegacyServices } from '../../../types';
import { ImportRuleAlertRest } from '../../detection_engine/types';
import { Note } from '../../note/saved_object';
import { PinnedEvent } from '../../pinned_event/saved_object';
import { Timeline } from '../saved_object';
import { validate } from '../../detection_engine/routes/rules/validate';

type PromiseFromStreams = ImportRuleAlertRest | Error;

const CHUNK_PARSED_OBJECT_SIZE = 10;
interface ImportTimelinesSchema {
  success: boolean;
  success_count: number;
  errors: BulkError[];
}
type ImportTimelineResponse = ExportedTimelines;
interface ImportTimelinesRequestParams {
  query: { overwrite: boolean };
  body: { file: HapiReadableStream };
}

const timelineLib = new Timeline();
const noteLib = new Note();
const pinnedEventLib = new PinnedEvent();

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
                        timeline = await timelineLib.getTimeline(frameworkRequest, savedObjectId);
                      } catch (e) {}

                      if (timeline == null) {
                        // create timeline

                        const newSavedObjectId = await saveTimelines(
                          frameworkRequest,
                          null,
                          null,
                          parsedTimelineObject,
                          resolve
                        );

                        await savePinnedEvents(
                          frameworkRequest,
                          null,
                          newSavedObjectId,
                          pinnedEventIds,
                          resolve
                        );

                        await saveNotes(
                          frameworkRequest,
                          newSavedObjectId,
                          null,
                          [],
                          [...globalNotes, ...eventNotes],
                          resolve
                        );

                        resolve({ timeline_id: newSavedObjectId, status_code: 200 });
                      } else if (timeline != null && frameworkRequest.query.overwrite) {
                        // update timeline

                        const updatedSavedObjectId = await saveTimelines(
                          frameworkRequest,
                          timeline.savedObjectId,
                          timeline.version,
                          parsedTimelineObject,
                          resolve
                        );

                        await savePinnedEvents(
                          frameworkRequest,
                          null,
                          timeline.savedObjectId,
                          pinnedEventIds,
                          resolve
                        );

                        console.log('------5------');

                        await saveNotes(
                          frameworkRequest,
                          timeline.savedObjectId,
                          timeline.version,
                          timeline.noteIds,
                          [...globalNotes, ...eventNotes],
                          resolve
                        );

                        resolve({ timeline_id: timeline.savedObjectId, status_code: 200 });
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
          statusCode: error.status_code,
        });
      }
    }
  );
};
