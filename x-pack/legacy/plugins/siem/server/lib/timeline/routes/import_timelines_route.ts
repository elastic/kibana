/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extname } from 'path';
import { chunk, omit } from 'lodash/fp';
import {
  buildRouteValidation,
  buildSiemResponse,
  createBulkErrorObject,
  isBulkError,
  BulkError,
  isImportRegular,
  transformError,
} from '../../detection_engine/routes/utils';
import { HapiReadableStream } from '../../detection_engine/rules/types';
import { IRouter } from '../../../../../../../../src/core/server';

import { ImportRuleAlertRest } from '../../detection_engine/types';
import { createPromiseFromStreams } from '../../../../../../../../src/legacy/utils';
import { getTupleDuplicateErrorsAndUniqueRules } from '../../detection_engine/routes/rules/utils';
import { validate } from '../../detection_engine/routes/rules/validate';
import {
  readTimeline,
  createTimelines,
  patchTimelines,
  persistPinnedEventOnTimeline,
  persistNote,
} from './utils';
import { LegacyServices } from '../../../types';
import { IMPORT_TIMELINES_URL } from '../../../../common/constants';
import {
  importTimelinesQuerySchema,
  importTimelinesPayloadSchema,
} from './schemas/import_timelines_schema';
import { importRulesSchema } from '../../detection_engine/routes/schemas/response/import_rules_schema';
import { createTimelinesStreamFromNdJson } from '../create_timelines_stream_from_ndjson';
type PromiseFromStreams = ImportRuleAlertRest | Error;

const CHUNK_PARSED_OBJECT_SIZE = 10;
interface ImportTimelinesSchema {
  success: boolean;
  success_count: number;
  errors: BulkError[];
}
interface ImportTimelineResponse {}
interface ImportTimelinesRequestParams {
  query: { overwrite: boolean };
  body: { file: HapiReadableStream };
}

export const importTimelinesRoute = (router: IRouter, config: LegacyServices['config']) => {
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

      if (!context.alerting || !context.actions) {
        return siemResponse.error({ statusCode: 404 });
      }

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
      console.log('xxxxxxxxxxxx1xxxxxxxxx');
      const objectLimit = config().get<number>('savedObjects.maxImportExportSize');
      try {
        const readStream = createTimelinesStreamFromNdJson(objectLimit);
        console.log('xxxxxxxxxxxx2xxxxxxxxx');

        const parsedObjects = await createPromiseFromStreams<PromiseFromStreams[]>([
          request.body.file,
          ...readStream,
        ]);
        console.log('-------a------');
        console.log(parsedObjects);
        const [duplicateIdErrors, uniqueParsedObjects] = getTupleDuplicateErrorsAndUniqueRules(
          parsedObjects,
          request.query.overwrite
        );
        console.log('-------b------');

        const chunkParseObjects = chunk(CHUNK_PARSED_OBJECT_SIZE, uniqueParsedObjects);
        let importTimelineResponse: ImportTimelineResponse[] = [];
        console.log('-------c------');

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
                    console.log('-----0------');
                    const {
                      savedObjectId,
                      version,
                      pinnedEventIds,
                      globalNotes,
                      eventNotes,
                    } = parsedTimeline;
                    try {
                      const timeline = await readTimeline({
                        request,
                        savedObjectsClient,
                        timelineId: savedObjectId,
                      });
                      console.log('------1------');
                      console.log(timeline);
                      if (timeline == null) {
                        const {
                          timeline: { savedObjectId: newSavedObjectId },
                        } = await createTimelines({
                          request,
                          savedObjectsClient,
                          timelineId: null,
                          version,
                          timeline: parsedTimeline,
                        });
                        console.log('------2------');
                        await Promise.all(
                          pinnedEventIds.map(eventId => {
                            return persistPinnedEventOnTimeline(
                              savedObjectsClient,
                              request,
                              null,
                              eventId,
                              newSavedObjectId
                            );
                          })
                        );
                        console.log('------3------');
                        await Promise.all(
                          [...eventNotes, ...globalNotes].map(note => {
                            return persistNote(savedObjectsClient, request, null, version, note);
                          })
                        );

                        resolve({ timeline_id: newSavedObjectId, status_code: 200 });
                      } else if (timeline != null && request.query.overwrite) {
                        console.log('------3.5------');

                        await patchTimelines({
                          request,
                          savedObjectsClient,
                          timelineId: savedObjectId,
                          version,
                          timeline: omit(
                            [
                              'globalNotes',
                              'eventNotes',
                              'pinnedEventIds',
                              'version',
                              'savedObjectId',
                            ],
                            parsedTimeline
                          ),
                        });
                        console.log('------4------');
                        await Promise.all(
                          pinnedEventIds.map(eventId => {
                            return persistPinnedEventOnTimeline(
                              savedObjectsClient,
                              request,
                              null,
                              eventId,
                              savedObjectId
                            );
                          })
                        );
                        console.log('------5------');
                        await Promise.all(
                          [...eventNotes, ...globalNotes].map(note => {
                            return persistNote(savedObjectsClient, request, null, version, note);
                          })
                        );
                        console.log('------6------');

                        resolve({ timeline_id: savedObjectId, status_code: 200 });
                      } else if (timeline != null) {
                        console.log('------7------');
                        resolve(
                          createBulkErrorObject({
                            savedObjectId,
                            statusCode: 409,
                            message: `timeline_id: "${savedObjectId}" already exists`,
                          })
                        );
                      }
                    } catch (err) {
                      resolve(
                        createBulkErrorObject({
                          savedObjectId,
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
