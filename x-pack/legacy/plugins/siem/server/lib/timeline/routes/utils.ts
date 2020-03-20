/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, set as _set } from 'lodash/fp';
import uuid from 'uuid';
import {
  noteSavedObjectType,
  pinnedEventSavedObjectType,
  timelineSavedObjectType,
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
  SavedObjectsFindResponse,
} from '../../../../../../../../src/core/server';
import { BulkError, createBulkErrorObject } from '../../detection_engine/routes/utils';

import {
  ExportedTimelines,
  ExportTimelineSavedObjectsClient,
  ExportTimelineRequest,
  ExportedNotes,
  SavedTimeline,
  TimelineSavedObject,
} from '../types';

import { transformDataToNdjson } from '../../detection_engine/routes/rules/utils';
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
  console.log('read timeline');
  console.log(timelineId);
  let savedObject;
  try {
    savedObject = await savedObjectsClient.get(timelineSavedObjectType, timelineId);
    console.log('read timeline from saved obj');
    console.log(savedObject);
  } catch (error) {
    console.log('read timeline error', error);
    return null;
  }
  console.log('read timeline -1', savedObject);
  const timelineSaveObject = convertSavedObjectToSavedTimeline(savedObject);
  console.log('read timeline -2', timelineSaveObject);
  const timelineWithNotesAndPinnedEvents = await Promise.all([
    getAllSavedNotesByTimelineId(savedObjectsClient, timelineSaveObject.savedObjectId),
    getAllPinnedEventsByTimelineId(savedObjectsClient, timelineSaveObject.savedObjectId),
    Promise.resolve(timelineSaveObject),
  ]);
  console.log('read timeline -3', timelineWithNotesAndPinnedEvents);

  const [notes, pinnedEvents, timeline] = timelineWithNotesAndPinnedEvents;

  console.log('read timeline -4', notes, pinnedEvents);

  return timelineWithReduxProperties(notes ?? [], pinnedEvents ?? [], timeline, userName);
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
    getAllSavedNotesByTimelineId(savedObjectsClient, timelineSaveObject.savedObjectId),
    getAllPinnedEventsByTimelineId(savedObjectsClient, timelineSaveObject.savedObjectId),
    Promise.resolve(timelineSaveObject),
  ]);

  const [notes, pinnedEvents, timeline] = timelineWithNotesAndPinnedEvents;

  return timelineWithReduxProperties(notes ?? [], pinnedEvents ?? [], timeline, userName);
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
    console.log('update timeline -1');
    return {
      code: 200,
      message: 'success',
      timeline: await getSavedTimeline(savedObjectsClient, request, timelineId),
    };
  } catch (err) {
    console.log('update timeline -2.0');
    if (timelineId != null && savedObjectsClient.errors.isConflictError(err)) {
      return {
        code: 409,
        message: err.message,
        timeline: await getSavedTimeline(savedObjectsClient, request, timelineId),
      };
      console.log('update timeline -2');
    } else if (getOr(null, 'output.statusCode', err) === 403) {
      const timelineToReturn: TimelineResult = {
        ...timeline,
        savedObjectId: '',
        version: '',
      };
      console.log('update timeline -3');
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
      console.log('persist timeline -1');
      let allPinnedEventId = [];
      if (timelineId != null) {
        try {
          allPinnedEventId = await getAllPinnedEventsByTimelineId(savedObjectsClient, timelineId);
        } catch (e) {}

        console.log('persist timeline -2');
        const isPinnedAlreadyExisting = allPinnedEventId.filter(
          pinnedEvent => pinnedEvent.eventId === eventId
        );
        console.log('persist timeline -3');
        if (isPinnedAlreadyExisting.length === 0) {
          const savedPinnedEvent: SavedPinnedEvent = {
            eventId,
            timelineId,
          };
          console.log('persist timeline -4');
          // create Pinned Event on Timeline
          return convertSavedObjectToSavedPinnedEvent(
            await savedObjectsClient.create(
              pinnedEventSavedObjectType,
              pickSavedPinnedEvent(pinnedEventId, savedPinnedEvent, request.user || null)
            ),
            timelineVersionSavedObject != null ? timelineVersionSavedObject : undefined
          );
        }
        console.log('persist timeline -5');
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
      console.log('create note------', noteId, version, note.timelineId);

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

export const getTupleDuplicateErrorsAndUniqueTimeline = (
  timelines: PromiseFromStreams[],
  isOverwrite: boolean
): [BulkError[], PromiseFromStreams[]] => {
  const { errors, timelinesAcc } = timelines.reduce(
    (acc, parsedTimeline) => {
      if (parsedTimeline instanceof Error) {
        acc.timelinesAcc.set(uuid.v4(), parsedTimeline);
      } else {
        const { savedObjectId } = parsedTimeline;
        if (savedObjectId != null) {
          if (acc.timelinesAcc.has(savedObjectId) && !isOverwrite) {
            acc.errors.set(
              uuid.v4(),
              createBulkErrorObject({
                savedObjectId,
                statusCode: 400,
                message: `More than one timeline with savedObjectId: "${savedObjectId}" found`,
              })
            );
          }
          acc.timelinesAcc.set(savedObjectId, parsedTimeline);
        } else {
          acc.timelinesAcc.set(uuid.v4(), parsedTimeline);
        }
      }

      return acc;
    }, // using map (preserves ordering)
    {
      errors: new Map<string, BulkError>(),
      timelinesAcc: new Map<string, PromiseFromStreams>(),
    }
  );

  return [Array.from(errors.values()), Array.from(timelinesAcc.values())];
};

const getAllSavedPinnedEvents = (
  pinnedEventsSavedObjects: SavedObjectsFindResponse<PinnedEventSavedObject>
): PinnedEventSavedObject[] => {
  return pinnedEventsSavedObjects != null
    ? (pinnedEventsSavedObjects?.saved_objects ?? []).map(savedObject =>
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
    ? noteSavedObjects.saved_objects.map(savedObject => convertSavedObjectToSavedNote(savedObject))
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

const getAllSavedNotesByTimelineId = async (
  savedObjectsClient: ExportTimelineSavedObjectsClient,
  timelineId: string
): Promise<NoteSavedObject[]> => {
  const noteSavedObject = await Promise.resolve(
    getNotesByTimelineId(savedObjectsClient, timelineId)
  );
  return getAllSavedNote(noteSavedObject);
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
  return currentPinnedEvents.map(event => event.eventId) ?? [];
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
      request.body.ids.map(timelineId => getNotesByTimelineId(savedObjectsClient, timelineId))
    ),
    Promise.all(
      request.body.ids.map(timelineId =>
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
    const myTimeline = timelines.find(t => t.savedObjectId === timelineId);
    if (myTimeline != null) {
      const timelineNotes = myNotes.filter(n => n.timelineId === timelineId);
      const timelinePinnedEventIds = myPinnedEventIds.filter(p => p.timelineId === timelineId);
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

const obj = {
  savedObjectId: '6d0d0240-6a92-11ea-a94d-4d5d586870c6',
  version: 'WzE5NCwxXQ==',
  columns: [
    {
      indexes: null,
      name: null,
      columnHeaderType: 'not-filtered',
      id: '@timestamp',
      searchable: null,
    },
    {
      indexes: null,
      name: null,
      columnHeaderType: 'not-filtered',
      id: 'message',
      searchable: null,
    },
    {
      indexes: null,
      name: null,
      columnHeaderType: 'not-filtered',
      id: 'event.category',
      searchable: null,
    },
    {
      indexes: null,
      name: null,
      columnHeaderType: 'not-filtered',
      id: 'event.action',
      searchable: null,
    },
    {
      indexes: null,
      name: null,
      columnHeaderType: 'not-filtered',
      id: 'host.name',
      searchable: null,
    },
    {
      indexes: null,
      name: null,
      columnHeaderType: 'not-filtered',
      id: 'source.ip',
      searchable: null,
    },
    {
      indexes: null,
      name: null,
      columnHeaderType: 'not-filtered',
      id: 'destination.ip',
      searchable: null,
    },
    {
      indexes: null,
      name: null,
      columnHeaderType: 'not-filtered',
      id: 'user.name',
      searchable: null,
    },
  ],
  dataProviders: [],
  description: 'description',
  eventType: 'all',
  filters: [],
  kqlMode: 'filter',
  kqlQuery: {
    filterQuery: {
      kuery: { kind: 'kuery', expression: '@timestamp : * ' },
      serializedQuery:
        '{"bool":{"should":[{"exists":{"field":"@timestamp"}}],"minimum_should_match":1}}',
    },
  },
  title: 'My duplicate timeline',
  dateRange: { start: 1584523907294, end: 1584610307294 },
  savedQueryId: null,
  sort: { columnId: '@timestamp', sortDirection: 'desc' },
  created: 1584698771424,
  createdBy: 'Unauthenticated',
  updated: 1584698771424,
  updatedBy: 'Unauthenticated',
  eventNotes: [],
  globalNotes: [],
  pinnedEventIds: ['k-gi8nABm-sIqJ_scOoS'],
};
