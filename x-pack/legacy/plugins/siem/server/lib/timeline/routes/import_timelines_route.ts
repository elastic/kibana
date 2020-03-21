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
import {
  readTimeline,
  createTimelines,
  patchTimelines,
  persistPinnedEventOnTimeline,
  persistNote,
  getTupleDuplicateErrorsAndUniqueTimeline,
} from './utils';
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
        const [duplicateIdErrors, uniqueParsedObjects] = getTupleDuplicateErrorsAndUniqueTimeline(
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
                      const timeline = await readTimeline({
                        request,
                        savedObjectsClient,
                        timelineId: savedObjectId,
                      });

                      console.log('------1------');
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
                        console.log('------2------', pinnedEventIds);
                        if (pinnedEventIds.length !== 0) {
                          await Promise.all(
                            pinnedEventIds.map(eventId => {
                              return pinnedEventLib.persistPinnedEventOnTimeline(
                                frameworkRequest,
                                null,
                                eventId,
                                newSavedObjectId
                              );
                            })
                          );
                        }
                        console.log('------3------');
                        if (eventNotes.length !== 0 || globalNotes.length !== 0) {
                          await Promise.all(
                            [...eventNotes, ...globalNotes].map(note => {
                              const newNote = {
                                note: note.note,
                                timelineId: newSavedObjectId,
                              };
                              return noteLib.persistNote(frameworkRequest, null, null, newNote);
                            })
                          );
                        }

                        resolve({ timeline_id: newSavedObjectId, status_code: 200 });
                      } else if (timeline != null && frameworkRequest.query.overwrite) {
                        // update timeline
                        const allPinnedEvent = await pinnedEventLib.getAllPinnedEventsByTimelineId(
                          frameworkRequest,
                          timeline.savedObjectId
                        );
                        const allPinnedEventSavedObjectId = allPinnedEvent.map(
                          e => e.pinnedEventId
                        );
                        await timelineLib.persistTimeline(
                          frameworkRequest,
                          timeline.savedObjectId,
                          timeline.version,
                          parsedTimelineObject
                        );
                        console.log('------4------', pinnedEventIds, allPinnedEventSavedObjectId);
                        // await Promise.all(
                        //   pinnedEventIds.map(eventId => {
                        //     const isExistingEvent = timeline.pinnedEventIds.find(
                        //       e => e !== eventId
                        //     );
                        //     if (isExistingEvent) {
                        //       return pinnedEventLib.persistPinnedEventOnTimeline(
                        //         frameworkRequest,
                        //         null,
                        //         eventId,
                        //         timeline.savedObjectId,
                        //         pinnedEventIds
                        //       );
                        //     } else {
                        //       // return pinnedEventLib.deletePinnedEventOnTimeline(frameworkRequest, [
                        //       //   eventId,
                        //       // ]);
                        //       return pinnedEventLib.persistPinnedEventOnTimeline(
                        //         frameworkRequest,
                        //         null,
                        //         eventId,
                        //         timeline.savedObjectId,
                        //         pinnedEventIds
                        //       );
                        //     }
                        //   })
                        // );

                        if (pinnedEventIds.length > allPinnedEventSavedObjectId.length) {
                          const addedEvents = difference(
                            pinnedEventIds,
                            allPinnedEventSavedObjectId
                          );
                          console.log('-----addedEvents', addedEvents);
                          await Promise.all(
                            addedEvents.map(eventId => {
                              return pinnedEventLib.persistPinnedEventOnTimeline(
                                frameworkRequest,
                                null,
                                eventId,
                                timeline.savedObjectId,
                                pinnedEventIds
                              );
                            })
                          );
                        } else if (pinnedEventIds.length < allPinnedEventSavedObjectId.length) {
                          const deletedEvents = difference(
                            allPinnedEventSavedObjectId,
                            pinnedEventIds
                          );
                          console.log('-----deletedEvents', deletedEvents);

                          await Promise.all(
                            deletedEvents.map(eventId => {
                              return pinnedEventLib.deletePinnedEventOnTimeline(frameworkRequest, [
                                eventId,
                              ]);
                            })
                          );
                        }

                        console.log('------5------');
                        await Promise.all(
                          [...eventNotes, ...globalNotes].map(note => {
                            const newNote = {
                              note: note.note,
                              timelineId: timeline.savedObjectId,
                            };
                            return noteLib.persistNote(
                              frameworkRequest,
                              timeline.noteIds.find(nId => nId === note.noteId) ?? null,
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
