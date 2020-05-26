/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set as _set } from 'lodash/fp';
import {
  noteSavedObjectType,
  pinnedEventSavedObjectType,
  timelineSavedObjectType,
} from '../../../../saved_objects';
import { NoteSavedObject } from '../../../note/types';
import { PinnedEventSavedObject } from '../../../pinned_event/types';
import { convertSavedObjectToSavedTimeline } from '../../convert_saved_object_to_savedtimeline';

import { convertSavedObjectToSavedPinnedEvent } from '../../../pinned_event/saved_object';
import { convertSavedObjectToSavedNote } from '../../../note/saved_object';

import {
  SavedObjectsClient,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
} from '../../../../../../../../../src/core/server';

import {
  ExportedTimelines,
  ExportTimelineSavedObjectsClient,
  ExportTimelineRequest,
  ExportedNotes,
  TimelineSavedObject,
} from '../../types';

import { transformDataToNdjson } from '../../../detection_engine/routes/rules/utils';
export type TimelineSavedObjectsClient = Pick<
  SavedObjectsClient,
  | 'get'
  | 'errors'
  | 'create'
  | 'bulkCreate'
  | 'delete'
  | 'find'
  | 'bulkGet'
  | 'update'
  | 'bulkUpdate'
>;

const getAllSavedPinnedEvents = (
  pinnedEventsSavedObjects: SavedObjectsFindResponse<PinnedEventSavedObject>
): PinnedEventSavedObject[] => {
  return pinnedEventsSavedObjects != null
    ? (pinnedEventsSavedObjects?.saved_objects ?? []).map((savedObject) =>
        convertSavedObjectToSavedPinnedEvent(savedObject)
      )
    : [];
};

const getPinnedEventsByTimelineId = (
  savedObjectsClient: ExportTimelineSavedObjectsClient,
  timelineId: string
): Promise<SavedObjectsFindResponse<PinnedEventSavedObject>> => {
  const options: SavedObjectsFindOptions = {
    type: pinnedEventSavedObjectType,
    search: timelineId,
    searchFields: ['timelineId'],
  };
  return savedObjectsClient.find(options);
};

const getAllSavedNote = (
  noteSavedObjects: SavedObjectsFindResponse<NoteSavedObject>
): NoteSavedObject[] => {
  return noteSavedObjects != null
    ? noteSavedObjects.saved_objects.map((savedObject) =>
        convertSavedObjectToSavedNote(savedObject)
      )
    : [];
};

const getNotesByTimelineId = (
  savedObjectsClient: ExportTimelineSavedObjectsClient,
  timelineId: string
): Promise<SavedObjectsFindResponse<NoteSavedObject>> => {
  const options: SavedObjectsFindOptions = {
    type: noteSavedObjectType,
    search: timelineId,
    searchFields: ['timelineId'],
  };

  return savedObjectsClient.find(options);
};

const getGlobalEventNotesByTimelineId = (currentNotes: NoteSavedObject[]): ExportedNotes => {
  const initialNotes: ExportedNotes = {
    eventNotes: [],
    globalNotes: [],
  };

  return (
    currentNotes.reduce((acc, note) => {
      if (note.eventId == null) {
        return {
          ...acc,
          globalNotes: [...acc.globalNotes, note],
        };
      } else {
        return {
          ...acc,
          eventNotes: [...acc.eventNotes, note],
        };
      }
    }, initialNotes) ?? initialNotes
  );
};

const getPinnedEventsIdsByTimelineId = (
  currentPinnedEvents: PinnedEventSavedObject[]
): string[] => {
  return currentPinnedEvents.map((event) => event.eventId) ?? [];
};

const getTimelines = async (
  savedObjectsClient: ExportTimelineSavedObjectsClient,
  timelineIds: string[]
) => {
  const savedObjects = await Promise.resolve(
    savedObjectsClient.bulkGet(
      timelineIds.reduce(
        (acc, timelineId) => [...acc, { id: timelineId, type: timelineSavedObjectType }],
        [] as Array<{ id: string; type: string }>
      )
    )
  );

  const timelineObjects: TimelineSavedObject[] | undefined =
    savedObjects != null
      ? savedObjects.saved_objects.map((savedObject: unknown) => {
          return convertSavedObjectToSavedTimeline(savedObject);
        })
      : [];

  return timelineObjects;
};

const getTimelinesFromObjects = async (
  savedObjectsClient: ExportTimelineSavedObjectsClient,
  request: ExportTimelineRequest
): Promise<ExportedTimelines[]> => {
  const timelines: TimelineSavedObject[] = await getTimelines(savedObjectsClient, request.body.ids);
  // To Do for feature freeze
  // if (timelines.length !== request.body.ids.length) {
  //   //figure out which is missing to tell user
  // }

  const [notes, pinnedEventIds] = await Promise.all([
    Promise.all(
      request.body.ids.map((timelineId) => getNotesByTimelineId(savedObjectsClient, timelineId))
    ),
    Promise.all(
      request.body.ids.map((timelineId) =>
        getPinnedEventsByTimelineId(savedObjectsClient, timelineId)
      )
    ),
  ]);

  const myNotes = notes.reduce<NoteSavedObject[]>(
    (acc, note) => [...acc, ...getAllSavedNote(note)],
    []
  );

  const myPinnedEventIds = pinnedEventIds.reduce<PinnedEventSavedObject[]>(
    (acc, pinnedEventId) => [...acc, ...getAllSavedPinnedEvents(pinnedEventId)],
    []
  );

  const myResponse = request.body.ids.reduce<ExportedTimelines[]>((acc, timelineId) => {
    const myTimeline = timelines.find((t) => t.savedObjectId === timelineId);
    if (myTimeline != null) {
      const timelineNotes = myNotes.filter((n) => n.timelineId === timelineId);
      const timelinePinnedEventIds = myPinnedEventIds.filter((p) => p.timelineId === timelineId);
      return [
        ...acc,
        {
          ...myTimeline,
          ...getGlobalEventNotesByTimelineId(timelineNotes),
          pinnedEventIds: getPinnedEventsIdsByTimelineId(timelinePinnedEventIds),
        },
      ];
    }
    return acc;
  }, []);

  return myResponse ?? [];
};

export const getExportTimelineByObjectIds = async ({
  client,
  request,
}: {
  client: ExportTimelineSavedObjectsClient;
  request: ExportTimelineRequest;
}) => {
  const timeline = await getTimelinesFromObjects(client, request);
  return transformDataToNdjson(timeline);
};
