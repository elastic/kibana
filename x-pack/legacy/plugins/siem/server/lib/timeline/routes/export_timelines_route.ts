/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

import { set as _set } from 'lodash/fp';
import { RequestHandlerContext } from '../../../../../../../../src/core/server';
import { GetScopedClients } from '../../../services';
import { LegacyServices, LegacyRequest } from '../../../types';
import { ExportTimelineRequest, ExportTimelineResults } from '../types';
import { timelineSavedObjectType } from '../../../saved_objects';
import { PinnedEvent } from '../../pinned_event/saved_object';
import { convertSavedObjectToSavedTimeline } from '../convert_saved_object_to_savedtimeline';
import { transformRulesToNdjson } from '../../detection_engine/routes/rules/utils';
import { Note } from '../../note/saved_object';
import { timelineWithReduxProperties } from '../saved_object';
import { transformError } from '../../detection_engine/routes/utils';
import { TIMELINE_EXPORT_URL } from '../../../../common/constants';

import { SavedObjectsClient } from '../../../../../../../../src/legacy/server/kbn_server';
import {
  exportTimelinesSchema,
  exportTimelinesQuerySchema,
} from './schemas/export_timelines_schema';
import { FrameworkRequest } from '../../framework';

const getExportTimelineByObjectIds = async (
  client: Pick<
    SavedObjectsClient,
    | 'get'
    | 'delete'
    | 'errors'
    | 'create'
    | 'bulkCreate'
    | 'find'
    | 'bulkGet'
    | 'update'
    | 'bulkUpdate'
  >,
  request: ExportTimelineRequest & LegacyRequest
) => {
  const { timeline } = await getTimelinesFromObjects(client, request);

  const timelinesNdjson = transformRulesToNdjson(timeline);
  return { timelinesNdjson };
};

const getTimelinesFromObjects = async (
  client: Pick<
    SavedObjectsClient,
    | 'get'
    | 'delete'
    | 'errors'
    | 'create'
    | 'bulkCreate'
    | 'find'
    | 'bulkGet'
    | 'update'
    | 'bulkUpdate'
  >,
  request: ExportTimelineRequest & LegacyRequest
): Promise<ExportTimelineResults> => {
  const note = new Note();
  const pinnedEvent = new PinnedEvent();
  const savedObjects = await client.bulkGet(
    request?.payload?.objects?.map(id => ({ id, type: timelineSavedObjectType }))
  );

  const requestWithClient: FrameworkRequest & RequestHandlerContext = {
    ...request,
    context: {
      core: {
        savedObjects: {
          client,
        },
      },
    },
  };
  const timelinesWithNotesAndPinnedEvents = await Promise.all(
    savedObjects.saved_objects.map(async savedObject => {
      const timelineSaveObject = convertSavedObjectToSavedTimeline(savedObject);
      return Promise.all([
        note.getNotesByTimelineId(requestWithClient, timelineSaveObject.savedObjectId),
        pinnedEvent.getAllPinnedEventsByTimelineId(
          requestWithClient,
          timelineSaveObject.savedObjectId
        ),
        Promise.resolve(timelineSaveObject),
      ]);
    })
  );

  return {
    timeline: timelinesWithNotesAndPinnedEvents.map(([notes, pinnedEvents, timeline]) =>
      timelineWithReduxProperties(notes, pinnedEvents, timeline)
    ),
  };
};

const createExportTimelinesRoute = (
  config: LegacyServices['config'],
  getClients: GetScopedClients
): Hapi.ServerRoute => {
  return {
    method: 'POST',
    path: TIMELINE_EXPORT_URL,
    options: {
      tags: ['access:siem'],
      validate: {
        options: {
          abortEarly: false,
        },
        payload: exportTimelinesSchema,
        query: exportTimelinesQuerySchema,
      },
    },
    async handler(request: ExportTimelineRequest & LegacyRequest, headers) {
      const { savedObjectsClient } = await getClients(request);

      if (!savedObjectsClient) {
        return headers.response().code(404);
      }

      try {
        const exportSizeLimit = config().get<number>('savedObjects.maxImportExportSize');
        if (request.payload?.objects != null && request.payload.objects.length > exportSizeLimit) {
          return headers
            .response({
              message: `Can't export more than ${exportSizeLimit} rules`,
              status_code: 400,
            })
            .code(400);
        }

        const exported = await getExportTimelineByObjectIds(savedObjectsClient, request);

        const response = headers.response(exported.timelinesNdjson);

        return response
          .header('Content-Disposition', `attachment; filename="${request.query.file_name}"`)
          .header('Content-Type', 'application/ndjson');
      } catch (err) {
        const error = transformError(err);
        return headers
          .response({
            message: error.message,
            status_code: error.statusCode,
          })
          .code(error.statusCode);
      }
    },
  };
};

export const exportTimelinesRoute = (
  route: LegacyServices['route'],
  config: LegacyServices['config'],
  getClients: GetScopedClients
): void => {
  route(createExportTimelinesRoute(config, getClients));
};
