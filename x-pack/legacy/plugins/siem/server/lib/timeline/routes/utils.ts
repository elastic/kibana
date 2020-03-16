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
  PinnedEventsByTimelineId,
  NotesByTimelineId,
} from '../types';
import {
  timelineSavedObjectType,
  noteSavedObjectType,
  pinnedEventSavedObjectType,
} from '../../../saved_objects';

import { convertSavedObjectToSavedTimeline } from '../convert_saved_object_to_savedtimeline';
import { transformRulesToNdjson } from '../../detection_engine/routes/rules/utils';
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
  return transformRulesToNdjson(timeline);
};

const getAllSavedNote = async (
  savedObjectsClient: ExportTimelineSavedObjectsClient,
  options: SavedObjectsFindOptions
): Promise<NoteSavedObject[]> => {
  const savedObjects = await savedObjectsClient.find(options);
  return savedObjects.saved_objects.map(savedObject => convertSavedObjectToSavedNote(savedObject));
};

const getNotesByTimelineId = async (
  savedObjectsClient: ExportTimelineSavedObjectsClient,
  timelineId: string
): Promise<NotesByTimelineId> => {
  const options: SavedObjectsFindOptions = {
    type: noteSavedObjectType,
    search: timelineId,
    searchFields: ['timelineId'],
  };

  return { [timelineId]: await Promise.resolve(getAllSavedNote(savedObjectsClient, options)) };
};

const getGlobalEventNotesByTimelineId = (
  notes: NotesByTimelineId[],
  timelineId: string
): ExportedNotes => {
  const initialNotes: ExportedNotes = {
    eventNotes: [],
    globalNotes: [],
  };
  const currentNotesRecord = notes.find(note => Object.keys(note)[0] === timelineId) ?? {};
  const currentNotes = currentNotesRecord[timelineId] ?? [];

  return (
    currentNotes?.reduce((acc, note) => {
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

const getTimeline = async (
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

const getPinnedEventsByTimelineId = async (
  savedObjectsClient: ExportTimelineSavedObjectsClient,
  timelineId: string
): Promise<PinnedEventsByTimelineId> => {
  const options: SavedObjectsFindOptions = {
    type: pinnedEventSavedObjectType,
    search: timelineId,
    searchFields: ['timelineId'],
  };
  return { [timelineId]: await getAllSavedPinnedEvents(savedObjectsClient, options) };
};

const getPinnedEventsIdsByTimelineId = (
  pinnedEvents: PinnedEventsByTimelineId[],
  timelineId: string
): string[] => {
  const currentPinnedEventsRecord =
    pinnedEvents.find(pinnedEvent => Object.keys(pinnedEvent)[0] === timelineId) ?? {};
  const currentPinnedEvents = currentPinnedEventsRecord[timelineId] ?? [];
  return currentPinnedEvents.map(event => event.eventId) ?? [];
};

const getTimelinesFromObjects = async (
  savedObjectsClient: ExportTimelineSavedObjectsClient,
  request: ExportTimelineRequest
): Promise<ExportedTimelines[]> => {
  const timelines: TimelineSavedObject[] = await getTimeline(
    savedObjectsClient,
    request.body.objects
  );

  const notes: NotesByTimelineId[] = await Promise.all(
    request.body.objects.reduce(
      (acc, timelineId) =>
        timelineId != null
          ? [...acc, getNotesByTimelineId(savedObjectsClient, timelineId)]
          : [...acc],
      [] as Array<Promise<NotesByTimelineId>>
    )
  );

  const pinnedEvents: PinnedEventsByTimelineId[] = await Promise.all(
    request.body.objects.reduce(
      (acc, timelineId) =>
        timelineId != null
          ? [...acc, getPinnedEventsByTimelineId(savedObjectsClient, timelineId)]
          : [...acc],
      [] as Array<Promise<PinnedEventsByTimelineId>>
    )
  );

  return (
    timelines?.map(timeline => {
      return {
        ...timeline,
        ...getGlobalEventNotesByTimelineId(notes, timeline.savedObjectId),
        pinnedEventIds: getPinnedEventsIdsByTimelineId(pinnedEvents, timeline.savedObjectId),
      };
    }) ?? []
  );
};
