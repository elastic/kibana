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
import { TIMELINE_IMPORT_URL } from '../../../../common/constants';
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
      path: `${TIMELINE_IMPORT_URL}`,
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
                        const newSavedObjectId = await createTimelines(
                          (frameworkRequest as unknown) as FrameworkRequest,
                          parsedTimelineObject,
                          null, // timelineSavedObjectId
                          null, // timelineVersion
                          pinnedEventIds,
                          [...globalNotes, ...eventNotes],
                          [] // existing note ids
                        );

                        resolve({ timeline_id: newSavedObjectId, status_code: 200 });
                      } else if (timeline != null && frameworkRequest.query.overwrite) {
                        // update timeline
                        console.log('--------------', timeline.noteIds);
                        const updatedSavedObjectId = await createTimelines(
                          (frameworkRequest as unknown) as FrameworkRequest,
                          parsedTimelineObject,
                          timeline.savedObjectId,
                          timeline.version,
                          pinnedEventIds,
                          [...globalNotes, ...eventNotes],
                          timeline.noteIds
                        );

                        resolve({ timeline_id: updatedSavedObjectId, status_code: 200 });
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

const a = {
  savedObjectId: 'd728f8a0-6d71-11ea-8681-136b509323c9',
  version: 'WzY2LDFd',
  columns: [
    { columnHeaderType: 'not-filtered', id: '@timestamp' },
    {
      aggregatable: true,
      columnHeaderType: 'not-filtered',
      id: 'dns.id',
      category: 'dns',
      type: 'string',
    },
    {
      aggregatable: true,
      columnHeaderType: 'not-filtered',
      id: 'event.category',
      category: 'event',
      type: 'string',
    },
    { columnHeaderType: 'not-filtered', id: 'message' },
    { columnHeaderType: 'not-filtered', id: 'event.action' },
    { columnHeaderType: 'not-filtered', id: 'host.name' },
    { columnHeaderType: 'not-filtered', id: 'source.ip' },
    { columnHeaderType: 'not-filtered', id: 'destination.ip' },
    { columnHeaderType: 'not-filtered', id: 'user.name' },
  ],
  dataProviders: [
    {
      excluded: false,
      and: [
        {
          excluded: false,
          kqlQuery: '',
          name: 'network_traffic',
          queryMatch: { field: 'event.category', value: 'network_traffic', operator: ':' },
          id:
            'event-details-value-default-draggable-plain-column-renderer-formatted-field-value-timeline-1-tqFOCXEB5OldxqFfSHbK-event_category-network_traffic',
          enabled: true,
        },
      ],
      kqlQuery: '',
      name: 'rock01',
      queryMatch: { field: 'host.name', value: 'rock01', operator: ':' },
      id: 'hosts-table-hostName-rock01',
      enabled: true,
    },
    {
      excluded: false,
      and: [],
      kqlQuery: '',
      name: 'North America',
      queryMatch: { field: 'source.geo.continent_name', value: 'North America', operator: ':' },
      id:
        'geo-field-values-default-draggable-netflow-renderer-timeline-1-yk1OCXEBIp5jk4oNSdBr-yk1OCXEBIp5jk4oNSdBr-source_geo_continent_name-North America',
      enabled: true,
    },
  ],
  description: 'Description of first timeline',
  eventType: 'raw',
  filters: [],
  kqlMode: 'search',
  kqlQuery: {
    filterQuery: {
      serializedQuery:
        '{"bool":{"should":[{"exists":{"field":"host.name"}}],"minimum_should_match":1}}',
      kuery: { expression: 'host.name : * ', kind: 'kuery' },
    },
  },
  title: 'First Timeline I',
  dateRange: { start: 1584394420034, end: 1584999220034 },
  savedQueryId: null,
  sort: { columnId: '@timestamp', sortDirection: 'desc' },
  favorite: [
    {
      favoriteDate: 1584999237951,
      keySearch: 'cm9iZXJ0LnNtaXRo',
      fullName: 'Robert Smith',
      userName: 'robert.smith',
    },
  ],
  created: 1585014629568,
  createdBy: 'angela',
  updated: 1585014629568,
  updatedBy: 'angela',
  eventNotes: [
    {
      noteId: 'd8ab2bd0-6d71-11ea-8681-136b509323c9',
      version: 'Wzc1LDFd',
      eventId: 'R5NQCXEBTvtefqrDwzsz',
      note: '# Local comment 2\n\n> the raven',
      timelineId: 'd728f8a0-6d71-11ea-8681-136b509323c9',
      created: 1585014631901,
      createdBy: 'angela',
      updated: 1585014631901,
      updatedBy: 'angela',
    },
    {
      noteId: 'd8ac1630-6d71-11ea-8681-136b509323c9',
      version: 'Wzc3LDFd',
      eventId: 'R5NQCXEBTvtefqrDwzsz',
      note: '# Local comment 1\na local comment',
      timelineId: 'd728f8a0-6d71-11ea-8681-136b509323c9',
      created: 1585014631900,
      createdBy: 'angela',
      updated: 1585014631900,
      updatedBy: 'angela',
    },
  ],
  globalNotes: [
    {
      noteId: 'd88c8040-6d71-11ea-8681-136b509323c9',
      version: 'WzcyLDFd',
      note: '# First timeline, second global note\nAnother global note',
      timelineId: 'd728f8a0-6d71-11ea-8681-136b509323c9',
      created: 1585014631900,
      createdBy: 'angela',
      updated: 1585014631900,
      updatedBy: 'angela',
    },
    {
      noteId: 'd8ab04c0-6d71-11ea-8681-136b509323c9',
      version: 'Wzc2LDFd',
      note: '# First timeline, first global note\n\n> The raven',
      timelineId: 'd728f8a0-6d71-11ea-8681-136b509323c9',
      created: 1585014631900,
      createdBy: 'angela',
      updated: 1585014631900,
      updatedBy: 'angela',
    },
  ],
  pinnedEventIds: ['R5NQCXEBTvtefqrDwzsz'],
};
