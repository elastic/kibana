/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set as _set } from 'lodash/fp';
import { IRouter, SavedObjectsBulkResponse } from '../../../../../../../../src/core/server';
import { LegacyServices } from '../../../types';
import {
  ExportTimelineRequestParams,
  ExportTimelineSavedObjectsClient,
  ExportTimelineRequest,
  ExportedNotes,
  TimelineSavedObject,
  ExportedTimelines,
  BulkGetInput,
} from '../types';
import { timelineSavedObjectType, noteSavedObjectType } from '../../../saved_objects';

import { convertSavedObjectToSavedTimeline } from '../convert_saved_object_to_savedtimeline';
import { transformRulesToNdjson } from '../../detection_engine/routes/rules/utils';
import { convertSavedObjectToSavedNote } from '../../note/saved_object';

import {
  transformError,
  buildRouteValidation,
  buildSiemResponse,
} from '../../detection_engine/routes/utils';
import { TIMELINE_EXPORT_URL } from '../../../../common/constants';

import {
  exportTimelinesSchema,
  exportTimelinesQuerySchema,
} from './schemas/export_timelines_schema';
import { NoteSavedObject } from '../../note/types';

const getExportTimelineByObjectIds = async ({
  client,
  request,
}: {
  client: ExportTimelineSavedObjectsClient;
  request: ExportTimelineRequest;
}) => {
  const timeline = await getTimelinesFromObjects(client, request);
  return transformRulesToNdjson(timeline);
};

const getNotesByTimelineId = (notes: NoteSavedObject[] | undefined, timelineId: string) => {
  const initialNotes: ExportedNotes = {
    eventNotes: [],
    globalNotes: [],
  };

  return (
    notes?.reduce((acc, note) => {
      if (note.timelineId === timelineId) {
        if (note.eventId == null)
          return {
            ...acc,
            globalNotes: [...acc.globalNotes, note],
          };
        else
          return {
            ...acc,
            eventNotes: [...acc.eventNotes, note],
          };
      } else return acc;
    }, initialNotes) ?? initialNotes
  );
};

const getTimelinesFromObjects = async (
  client: ExportTimelineSavedObjectsClient,
  request: ExportTimelineRequest
): Promise<ExportedTimelines[]> => {
  const bulkGetTimelines = request.body.objects.map((item): { type: string; id: string } => ({
    id: item.timelineId,
    type: timelineSavedObjectType,
  }));

  const bulkGetNotes = request.body.objects.reduce((acc, item) => {
    return item.noteIds.length > 0
      ? [
          ...acc,
          ...item.noteIds?.map(
            (noteId): BulkGetInput => ({
              id: noteId,
              type: noteSavedObjectType,
            })
          ),
        ]
      : acc;
  }, [] as BulkGetInput[]);

  const savedObjects: [
    SavedObjectsBulkResponse<unknown> | null,
    SavedObjectsBulkResponse<unknown> | null
  ] = await Promise.all([
    bulkGetTimelines.length > 0 ? client.bulkGet(bulkGetTimelines) : Promise.resolve(null),
    bulkGetNotes.length > 0 ? client.bulkGet(bulkGetNotes) : Promise.resolve(null),
  ]);

  const timelineObjects: TimelineSavedObject[] | undefined = savedObjects[0]
    ? savedObjects[0]?.saved_objects.map((savedObject: unknown) => {
        return convertSavedObjectToSavedTimeline(savedObject);
      })
    : undefined;

  const noteObjects: NoteSavedObject[] | undefined = savedObjects[1]
    ? savedObjects[1]?.saved_objects?.map((savedObject: unknown) =>
        convertSavedObjectToSavedNote(savedObject)
      )
    : undefined;

  return (
    timelineObjects?.map(timeline => {
      return {
        ...timeline,
        ...getNotesByTimelineId(noteObjects, timeline.savedObjectId),
        pinnedEventIds:
          request.body.objects.find(item => item.timelineId === timeline.savedObjectId)
            ?.pinnedEventIds ?? [],
      };
    }) ?? []
  );
};

export const exportTimelinesRoute = (router: IRouter, config: LegacyServices['config']) => {
  router.post(
    {
      path: TIMELINE_EXPORT_URL,
      validate: {
        query: buildRouteValidation<ExportTimelineRequestParams['query']>(
          exportTimelinesQuerySchema
        ),
        body: buildRouteValidation<ExportTimelineRequestParams['body']>(exportTimelinesSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;
      const siemResponse = buildSiemResponse(response);

      try {
        const exportSizeLimit = config().get<number>('savedObjects.maxImportExportSize');
        if (request.body?.objects != null && request.body.objects.length > exportSizeLimit) {
          return siemResponse.error({
            statusCode: 400,
            body: `Can't export more than ${exportSizeLimit} timelines`,
          });
        }

        const responseBody = await getExportTimelineByObjectIds({
          client: savedObjectsClient,
          request,
        });

        return response.ok({
          headers: {
            'Content-Disposition': `attachment; filename="${request.query.file_name}"`,
            'Content-Type': 'application/ndjson',
          },
          body: responseBody,
        });
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
