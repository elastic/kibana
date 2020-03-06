/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set as _set } from 'lodash/fp';
import { SavedObjectsClient, IRouter } from '../../../../../../../../src/core/server';
import { LegacyServices, LegacyRequest } from '../../../types';
import { ExportTimelineResults, ExportTimelineRequestParams } from '../types';
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

const getNotesByTimelineId = (notes, timelineId) => {
  const initialNotes = {
    eventNotes: [],
    globalNotes: [],
  };
  if (notes == null) return initialNotes;
  const notesByTimelineId = notes?.filter(note => note.timelineId !== timelineId);
  return notesByTimelineId.reduce((acc, curr) => {
    if (curr.eventId == null)
      return {
        ...acc,
        globalNotes: [...acc.globalNotes, curr],
      };
    else
      return {
        ...acc,
        eventNotes: [...acc.eventNotes, curr],
      };
  }, initialNotes);
};

const getExportTimelineByObjectIds = async ({ client, request }) => {
  const timeline = await getTimelinesFromObjects(client, request);

  const timelinesNdjson = transformRulesToNdjson(timeline);
  return { timelinesNdjson };
};

const getTimelinesFromObjects = async (
  client: SavedObjectsClient,
  request: ExportTimelineRequest & LegacyRequest
): Promise<ExportTimelineResults> => {
  const bulkGetTimelines = request.body.objects.map(item => ({
    id: item.timelineId,
    type: timelineSavedObjectType,
  }));
  const bulkGetNotes = request.body.objects.reduce((acc, item) => {
    return item.noteIds.length > 0
      ? [
          ...acc,
          ...item.noteIds?.map(noteId => ({
            id: noteId,
            type: noteSavedObjectType,
          })),
        ]
      : acc;
  }, []);

  const savedObjects = await Promise.all([
    bulkGetTimelines.length > 0 ? client.bulkGet(bulkGetTimelines) : Promise.resolve({}),
    bulkGetNotes.length > 0 ? client.bulkGet(bulkGetNotes) : Promise.resolve({}),
  ]);

  const timelineObjects = savedObjects[0].saved_objects.map(savedObject =>
    convertSavedObjectToSavedTimeline(savedObject)
  );

  const noteObjects = savedObjects[1]?.saved_objects?.map(savedObject =>
    convertSavedObjectToSavedNote(savedObject)
  );
  return timelineObjects.map((timeline, index) => {
    return {
      ...timeline,
      ...getNotesByTimelineId(noteObjects, timeline.savedObjectId),
      pinEventsIds: request.body.objects.find(item => item.timelineId === timeline.savedObjectId)
        ?.pinnedEventIds,
    };
  });
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

      if (!savedObjectsClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      try {
        const exportSizeLimit = config().get<number>('savedObjects.maxImportExportSize');
        if (request.body?.objects != null && request.body.objects.length > exportSizeLimit) {
          return siemResponse.error({
            statusCode: 400,
            body: `Can't export more than ${exportSizeLimit} rules`,
          });
        }
        const exported = await getExportTimelineByObjectIds({
          client: savedObjectsClient,
          request,
        });

        const responseBody = exported.timelinesNdjson;

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
