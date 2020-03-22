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
import { HapiReadableStream } from '../../detection_engine/rules/types';
import { IRouter } from '../../../../../../../../src/core/server';

import { ImportRuleAlertRest } from '../../detection_engine/types';
import { createPromiseFromStreams } from '../../../../../../../../src/legacy/utils';
import { getTupleDuplicateErrorsAndUniqueRules } from '../../detection_engine/routes/rules/utils';
import { validate } from '../../detection_engine/routes/rules/validate';
import { getTupleDuplicateErrorsAndUniqueTimeline } from './utils';
import { LegacyServices } from '../../../types';
import { IMPORT_TIMELINES_URL } from '../../../../common/constants';
import {
  importTimelinesQuerySchema,
  importTimelinesPayloadSchema,
} from './schemas/import_timelines_schema';
import { importRulesSchema } from '../../detection_engine/routes/schemas/response/import_rules_schema';
import { createTimelinesStreamFromNdJson } from '../create_timelines_stream_from_ndjson';
import { Timeline } from '../saved_object';
import { PinnedEvent } from '../../pinned_event/saved_object';
import { Note } from '../../note/saved_object';
import { ExportedTimelines } from '../types';
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
                    console.log('-----0------');
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

                      console.log('------1------', timeline);
                      console.log(timeline);

                      if (timeline == null) {
                        // create timeline
                        const {
                          timeline: { savedObjectId: newSavedObjectId },
                        } = await timelineLib.persistTimeline(
                          frameworkRequest,
                          null,
                          null,
                          parsedTimelineObject
                        );
                        if (pinnedEventIds.length !== 0) {
                          console.log('------2------', pinnedEventIds);

                          const createdPinnedEvents = await Promise.all(
                            pinnedEventIds.map(eventId => {
                              return pinnedEventLib.persistPinnedEventOnTimeline(
                                frameworkRequest,
                                null,
                                eventId,
                                newSavedObjectId
                              );
                            })
                          );

                          const errorMsg = createdPinnedEvents
                            .reduce((acc, e) => {
                              console.log('-----2.5-----', e instanceof Error, e);
                              return e != null && e instanceof Error
                                ? [...acc, e.message]
                                : [...acc];
                            }, [])
                            .join(',');
                          if (errorMsg.length !== 0) {
                            resolve(
                              createBulkErrorObject({
                                id: newSavedObjectId,
                                statusCode: 500,
                                message: errorMsg,
                              })
                            );
                          }
                        }
                        if (eventNotes.length !== 0 || globalNotes.length !== 0) {
                          console.log('------3------', eventNotes, globalNotes);

                          await Promise.all(
                            [...eventNotes, ...globalNotes].map(note => {
                              const newNote = {
                                eventId: note.eventId,
                                note: note.note,
                                timelineId: newSavedObjectId,
                              };
                              return noteLib.persistNote(frameworkRequest, null, null, newNote);
                            })
                          );
                        }
                        console.log('---test3--');
                        resolve({ timeline_id: newSavedObjectId, status_code: 200 });
                      } else if (timeline != null && frameworkRequest.query.overwrite) {
                        // update timeline

                        await timelineLib.persistTimeline(
                          frameworkRequest,
                          timeline.savedObjectId,
                          timeline.version,
                          parsedTimelineObject
                        );

                        await Promise.all(
                          pinnedEventIds.map(eventId => {
                            return pinnedEventLib.persistPinnedEventOnTimeline(
                              frameworkRequest,
                              null,
                              eventId,
                              timeline.savedObjectId
                            );
                          })
                        );

                        console.log('------5------');
                        await Promise.all(
                          [...eventNotes, ...globalNotes].map(note => {
                            const newNote = {
                              eventId: note.eventId,
                              note: note.note,
                              timelineId: timeline.savedObjectId,
                            };
                            return noteLib.persistNote(
                              frameworkRequest,
                              timeline.noteIds?.find(nId => nId === note.noteId) ?? null,
                              timeline.version,
                              newNote
                            );
                          })
                        );
                        console.log('------6------');

                        resolve({ timeline_id: timeline.savedObjectId, status_code: 200 });
                      } else if (timeline != null) {
                        console.log('------7------');
                        resolve(
                          createBulkErrorObject({
                            id: savedObjectId,
                            statusCode: 409,
                            message: `timeline_id: "${savedObjectId}" already exists`,
                          })
                        );
                      }
                    } catch (err) {
                      console.log('------8------');

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
        console.log('---collected response--', importTimelines);
        const [validated, errors] = validate(importTimelines, importRulesSchema);
        console.log('----collected error---', validated.errors, errors);

        if (errors != null) {
          return siemResponse.error({ statusCode: 500, body: errors });
        } else {
          console.log('----before response----', validated.errors);
          return response.ok({ body: validated ?? {} });
        }
      } catch (err) {
        const error = transformError(err);

        // console.log(error);

        return siemResponse.error({
          body: error.message,
          statusCode: error.status_code,
        });
      }
    }
  );
};
