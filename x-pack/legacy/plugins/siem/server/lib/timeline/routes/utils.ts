/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import uuid from 'uuid';
import {
  pinnedEventSavedObjectType,
  timelineSavedObjectType,
  noteSavedObjectType,
} from '../../../saved_objects';
import { NoteSavedObject, SavedNote } from '../../note/types';
import { PinnedEventSavedObject, SavedPinnedEvent } from '../../pinned_event/types';
import { convertSavedObjectToSavedTimeline } from '../convert_saved_object_to_savedtimeline';
import { UNAUTHENTICATED_USER } from '../../../../common/constants';
import { timelineWithReduxProperties } from '../saved_object';
import {
  convertSavedObjectToSavedPinnedEvent,
  pickSavedPinnedEvent,
} from '../../pinned_event/saved_object';
import { convertSavedObjectToSavedNote, pickSavedNote } from '../../note/saved_object';
import { ResponseTimeline, ResponseNote, NoteResult } from '../../../graphql/types';
import { pickSavedTimeline } from '../pick_saved_timeline';
import {
  SavedObjectsClient,
  SavedObjectsFindOptions,
} from '../../../../../../../../src/core/server';
import { SavedTimeline } from '../types';
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

interface TimelineResult {}
interface ImportTimelineRequest {}
interface PinnedEventResponse {}

const getAllSavedNote = async (
  savedObjectsClient: TimelineSavedObjectsClient,
  options: SavedObjectsFindOptions
) => {
  const savedObjects = await savedObjectsClient.find(options);

  return {
    totalCount: savedObjects.total,
    notes: savedObjects.saved_objects.map(savedObject =>
      convertSavedObjectToSavedNote(savedObject)
    ),
  };
};

const getNotesByTimelineId = async (
  savedObjectsClient: TimelineSavedObjectsClient,
  timelineId: string
): Promise<NoteSavedObject[]> => {
  const options: SavedObjectsFindOptions = {
    type: noteSavedObjectType,
    search: timelineId,
    searchFields: ['timelineId'],
  };
  const notesByTimelineId = await getAllSavedNote(savedObjectsClient, options);
  return notesByTimelineId.notes;
};

const getAllSavedPinnedEvents = async (
  savedObjectsClient: TimelineSavedObjectsClient,
  options: SavedObjectsFindOptions
) => {
  const savedObjects = await savedObjectsClient.find(options);

  return savedObjects.saved_objects.map(savedObject =>
    convertSavedObjectToSavedPinnedEvent(savedObject)
  );
};

const getAllPinnedEventsByTimelineId = async (
  savedObjectsClient: TimelineSavedObjectsClient,
  timelineId: string
): Promise<PinnedEventSavedObject[]> => {
  const options: SavedObjectsFindOptions = {
    type: pinnedEventSavedObjectType,
    search: timelineId,
    searchFields: ['timelineId'],
  };
  return getAllSavedPinnedEvents(savedObjectsClient, options);
};

export const readTimeline = async ({
  request,
  savedObjectsClient,
  timelineId,
}: {
  request: ImportTimelineRequest;
  savedObjectsClient: TimelineSavedObjectsClient;
  timelineId: string;
}) => {
  const userName = request.user?.username ?? UNAUTHENTICATED_USER;

  const savedObject = await savedObjectsClient.get(timelineSavedObjectType, timelineId);
  const timelineSaveObject = convertSavedObjectToSavedTimeline(savedObject);
  const timelineWithNotesAndPinnedEvents = await Promise.all([
    getNotesByTimelineId(savedObjectsClient, savedObjectsClient, timelineSaveObject.savedObjectId),
    getAllPinnedEventsByTimelineId(savedObjectsClient, timelineSaveObject.savedObjectId),
    Promise.resolve(timelineSaveObject),
  ]);

  const [notes, pinnedEvents, timeline] = timelineWithNotesAndPinnedEvents;

  return timelineWithReduxProperties(notes, pinnedEvents, timeline, userName);
};

export const createTimelines = ({
  request,
  savedObjectsClient,
  timelineId,
  version,
  timeline,
}: {
  request: ImportTimelineRequest;
  savedObjectsClient: TimelineSavedObjectsClient;
  timelineId: string | null;
  version: string | null;
  timeline: SavedTimeline;
}) => {
  return persistTimeline({ request, savedObjectsClient, timelineId, version, timeline });
};

export const patchTimelines = ({
  request,
  savedObjectsClient,
  timelineId,
  version,
  timeline,
}: {
  request: ImportTimelineRequest;
  savedObjectsClient: TimelineSavedObjectsClient;
  timelineId: string | null;
  version: string | null;
  timeline: SavedTimeline;
}) => {
  return persistTimeline({ request, savedObjectsClient, timelineId, version, timeline });
};

const getSavedTimeline = async (
  savedObjectsClient: TimelineSavedObjectsClient,
  request: ImportTimelineRequest,
  timelineId: string
) => {
  const userName = request.user?.username ?? UNAUTHENTICATED_USER;
  const savedObject = await savedObjectsClient.get(timelineSavedObjectType, timelineId);
  const timelineSaveObject = convertSavedObjectToSavedTimeline(savedObject);
  const timelineWithNotesAndPinnedEvents = await Promise.all([
    getNotesByTimelineId(savedObjectsClient, timelineSaveObject.savedObjectId),
    getAllPinnedEventsByTimelineId(savedObjectsClient, timelineSaveObject.savedObjectId),
    Promise.resolve(timelineSaveObject),
  ]);

  const [notes, pinnedEvents, timeline] = timelineWithNotesAndPinnedEvents;

  return timelineWithReduxProperties(notes, pinnedEvents, timeline, userName);
};

const deletePinnedEventOnTimeline = async (
  savedObjectsClient: TimelineSavedObjectsClient,
  pinnedEventIds: string[]
) => {
  await Promise.all(
    pinnedEventIds.map(pinnedEventId =>
      savedObjectsClient.delete(pinnedEventSavedObjectType, pinnedEventId)
    )
  );
};

const persistTimeline = async ({
  request,
  savedObjectsClient,
  timelineId,
  version,
  timeline,
}: {
  request: ImportTimelineRequest;
  savedObjectsClient: TimelineSavedObjectsClient;
  timelineId: string | null;
  version: string | null;
  timeline: SavedTimeline;
}): Promise<ResponseTimeline> => {
  try {
    if (timelineId == null) {
      // Create new timeline
      return {
        code: 200,
        message: 'success',
        timeline: convertSavedObjectToSavedTimeline(
          await savedObjectsClient.create(
            timelineSavedObjectType,
            pickSavedTimeline(timelineId, timeline, request.user)
          )
        ),
      };
    }
    // Update Timeline
    await savedObjectsClient.update(
      timelineSavedObjectType,
      timelineId,
      pickSavedTimeline(timelineId, timeline, request.user),
      {
        version: version || undefined,
      }
    );
    return {
      code: 200,
      message: 'success',
      timeline: await getSavedTimeline(savedObjectsClient, request, timelineId),
    };
  } catch (err) {
    if (timelineId != null && savedObjectsClient.errors.isConflictError(err)) {
      return {
        code: 409,
        message: err.message,
        timeline: await getSavedTimeline(savedObjectsClient, request, timelineId),
      };
    } else if (getOr(null, 'output.statusCode', err) === 403) {
      const timelineToReturn: TimelineResult = {
        ...timeline,
        savedObjectId: '',
        version: '',
      };
      return {
        code: 403,
        message: err.message,
        timeline: timelineToReturn,
      };
    }
    throw err;
  }
};

export const persistPinnedEventOnTimeline = async (
  savedObjectsClient: TimelineSavedObjectsClient,
  request: ImportTimelineRequest,
  pinnedEventId: string | null,
  eventId: string,
  timelineId: string | null
): Promise<PinnedEventResponse | null> => {
  try {
    if (pinnedEventId == null) {
      const timelineVersionSavedObject =
        timelineId == null
          ? await (async () => {
              const timelineResult = convertSavedObjectToSavedTimeline(
                await savedObjectsClient.create(
                  timelineSavedObjectType,
                  pickSavedTimeline(null, {}, request.user || null)
                )
              );
              timelineId = timelineResult.savedObjectId; // eslint-disable-line no-param-reassign
              return timelineResult.version;
            })()
          : null;

      if (timelineId != null) {
        const allPinnedEventId = await getAllPinnedEventsByTimelineId(
          savedObjectsClient,
          timelineId
        );
        const isPinnedAlreadyExisting = allPinnedEventId.filter(
          pinnedEvent => pinnedEvent.eventId === eventId
        );
        if (isPinnedAlreadyExisting.length === 0) {
          const savedPinnedEvent: SavedPinnedEvent = {
            eventId,
            timelineId,
          };
          // create Pinned Event on Timeline
          return convertSavedObjectToSavedPinnedEvent(
            await savedObjectsClient.create(
              pinnedEventSavedObjectType,
              pickSavedPinnedEvent(pinnedEventId, savedPinnedEvent, request.user || null)
            ),
            timelineVersionSavedObject != null ? timelineVersionSavedObject : undefined
          );
        }
        return isPinnedAlreadyExisting[0];
      }
      throw new Error('You can NOT pinned event without a timelineID');
    }
    // Delete Pinned Event on Timeline
    await deletePinnedEventOnTimeline(savedObjectsClient, [pinnedEventId]);
    return null;
  } catch (err) {
    if (getOr(null, 'output.statusCode', err) === 404) {
      /*
       * Why we are doing that, because if it is not found for sure that it will be unpinned
       * There is no need to bring back this error since we can assume that it is unpinned
       */
      return null;
    }
    if (getOr(null, 'output.statusCode', err) === 403) {
      return pinnedEventId != null
        ? {
            code: 403,
            message: err.message,
            pinnedEventId: eventId,
            timelineId: '',
            timelineVersion: '',
          }
        : null;
    }
    throw err;
  }
};

export const persistNote = async (
  savedObjectsClient: TimelineSavedObjectsClient,
  request: ImportTimelineRequest,
  noteId: string | null,
  version: string | null,
  note: SavedNote
): Promise<ResponseNote> => {
  try {
    if (noteId == null) {
      const timelineVersionSavedObject =
        note.timelineId == null
          ? await (async () => {
              const timelineResult = convertSavedObjectToSavedTimeline(
                await savedObjectsClient.create(
                  timelineSavedObjectType,
                  pickSavedTimeline(null, {}, request.user)
                )
              );
              note.timelineId = timelineResult.savedObjectId;
              return timelineResult.version;
            })()
          : null;

      // Create new note
      return {
        code: 200,
        message: 'success',
        note: convertSavedObjectToSavedNote(
          await savedObjectsClient.create(
            noteSavedObjectType,
            pickSavedNote(noteId, note, request.user)
          ),
          timelineVersionSavedObject != null ? timelineVersionSavedObject : undefined
        ),
      };
    }

    // Update new note
    return {
      code: 200,
      message: 'success',
      note: convertSavedObjectToSavedNote(
        await savedObjectsClient.update(
          noteSavedObjectType,
          noteId,
          pickSavedNote(noteId, note, request.user),
          {
            version: version || undefined,
          }
        )
      ),
    };
  } catch (err) {
    if (getOr(null, 'output.statusCode', err) === 403) {
      const noteToReturn: NoteResult = {
        ...note,
        noteId: uuid.v1(),
        version: '',
        timelineId: '',
        timelineVersion: '',
      };
      return {
        code: 403,
        message: err.message,
        note: noteToReturn,
      };
    }
    throw err;
  }
};
