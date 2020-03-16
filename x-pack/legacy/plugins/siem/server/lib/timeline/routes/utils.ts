/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { set as _set } from 'lodash/fp';
import { SavedObjectsFindOptions } from '../../../../../../../../src/core/server';

import {
  ExportTimelineSavedObjectsClient,
  ExportTimelineRequest,
  ExportedNotes,
  TimelineSavedObject,
  ExportedTimelines,
  NotesAndPinnedEventsByTimelineId,
} from '../types';
import {
  timelineSavedObjectType,
  noteSavedObjectType,
  pinnedEventSavedObjectType,
} from '../../../saved_objects';

import { convertSavedObjectToSavedTimeline } from '../convert_saved_object_to_savedtimeline';
import { transformDataToNdjson } from '../../detection_engine/routes/rules/utils';
import { convertSavedObjectToSavedNote } from '../../note/saved_object';

import { NoteSavedObject } from '../../note/types';
import { convertSavedObjectToSavedPinnedEvent } from '../../pinned_event/saved_object';
import { PinnedEventSavedObject } from '../../pinned_event/types';

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

const getAllSavedNote = async (
  savedObjectsClient: ExportTimelineSavedObjectsClient,
  options: SavedObjectsFindOptions
): Promise<NoteSavedObject[]> => {
  const savedObjects = await savedObjectsClient.find(options);
  return savedObjects.saved_objects.map(savedObject => convertSavedObjectToSavedNote(savedObject));
};

const getNotesByTimelineId = (
  savedObjectsClient: ExportTimelineSavedObjectsClient,
  timelineId: string
): Promise<NoteSavedObject[]> => {
  const options: SavedObjectsFindOptions = {
    type: noteSavedObjectType,
    search: timelineId,
    searchFields: ['timelineId'],
  };

  return getAllSavedNote(savedObjectsClient, options);
};

const getNotesAndPinnedEventsByTimelineId = async (
  savedObjectsClient: ExportTimelineSavedObjectsClient,
  timelineId: string
): Promise<NotesAndPinnedEventsByTimelineId> => {
  return {
    [timelineId]: {
      notes: await Promise.resolve(getNotesByTimelineId(savedObjectsClient, timelineId)),
      pinnedEvents: await Promise.resolve(
        getPinnedEventsByTimelineId(savedObjectsClient, timelineId)
      ),
    },
  };
};

const getGlobalEventNotesByTimelineId = (currentNotes: NoteSavedObject[]): ExportedNotes => {
  const initialNotes: ExportedNotes = {
    eventNotes: [],
    globalNotes: [],
  };

  return (
    currentNotes.reduce((acc, note) => {
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
    }, initialNotes) ?? initialNotes
  );
};

const getExportedNotedandPinnedEvents = (
  data: NotesAndPinnedEventsByTimelineId[],
  timelineId: string
) => {
  const currentRecord = data.find(note => Object.keys(note)[0] === timelineId) ?? {};
  const currentNote = currentRecord[timelineId].notes ?? [];
  const currentPinnedEvents = currentRecord[timelineId].pinnedEvents ?? [];

  return {
    ...getGlobalEventNotesByTimelineId(currentNote),
    pinnedEventIds: getPinnedEventsIdsByTimelineId(currentPinnedEvents),
  };
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

const getAllSavedPinnedEvents = async (
  savedObjectsClient: ExportTimelineSavedObjectsClient,
  options: SavedObjectsFindOptions
): Promise<PinnedEventSavedObject[]> => {
  const savedObjects = await savedObjectsClient.find(options);

  return savedObjects.saved_objects.map(savedObject =>
    convertSavedObjectToSavedPinnedEvent(savedObject)
  );
};

const getPinnedEventsByTimelineId = (
  savedObjectsClient: ExportTimelineSavedObjectsClient,
  timelineId: string
): Promise<PinnedEventSavedObject[]> => {
  const options: SavedObjectsFindOptions = {
    type: pinnedEventSavedObjectType,
    search: timelineId,
    searchFields: ['timelineId'],
  };
  return getAllSavedPinnedEvents(savedObjectsClient, options);
};

const getPinnedEventsIdsByTimelineId = (
  currentPinnedEvents: PinnedEventSavedObject[]
): string[] => {
  return currentPinnedEvents.map(event => event.eventId) ?? [];
};

const getTimelinesFromObjects = async (
  savedObjectsClient: ExportTimelineSavedObjectsClient,
  request: ExportTimelineRequest
): Promise<ExportedTimelines[]> => {
  const timelines: TimelineSavedObject[] = await getTimelines(
    savedObjectsClient,
    request.body.objects
  );

  const notesAndPinnedEvents: NotesAndPinnedEventsByTimelineId[] = await Promise.all(
    request.body.objects.reduce(
      (acc, timelineId) =>
        timelineId != null
          ? [...acc, getNotesAndPinnedEventsByTimelineId(savedObjectsClient, timelineId)]
          : [...acc],
      [] as Array<Promise<NotesAndPinnedEventsByTimelineId>>
    )
  );

  return (
    timelines?.map(timeline => {
      return {
        ...timeline,
        ...getExportedNotedandPinnedEvents(notesAndPinnedEvents, timeline.savedObjectId),
      };
    }) ?? []
  );
};
