/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { createBulkErrorObject } from '../../../detection_engine/routes/utils';
import { PinnedEvent } from '../../../pinned_event/saved_object';
import { Note } from '../../../note/saved_object';

import { Timeline } from '../../saved_object';

const pinnedEventLib = new PinnedEvent();
const timelineLib = new Timeline();
const noteLib = new Note();
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

export const getCollectErrorMessages = (savedObject: []) => {
  return savedObject
    .reduce((acc, e) => {
      return e != null && e instanceof Error ? [...acc, e.message] : [...acc];
    }, [])
    .join(',');
};

export const saveTimelines = async (
  frameworkRequest,
  timelineSavedObjectId = null,
  timelineVersion = null,
  timeline,
  resolve
) => {
  const newTimelineRes = await timelineLib.persistTimeline(
    frameworkRequest,
    timelineSavedObjectId,
    timelineVersion,
    timeline
  );
  const newSavedObjectId = newTimelineRes?.timeline?.savedObjectId ?? null;

  if (timelineSavedObjectId != null && newSavedObjectId == null) {
    resolve(
      createBulkErrorObject({
        id: newSavedObjectId,
        statusCode: 500,
        message: 'Create timeline savedObject failed',
      })
    );
  }

  return newSavedObjectId;
};

export const savePinnedEvents = async (
  frameworkRequest,
  timelineSavedObjectId,
  pinnedEventIds,
  resolve
) => {
  if (pinnedEventIds.length !== 0) {
    const createdPinnedEvents = await Promise.all(
      pinnedEventIds.map(eventId => {
        return pinnedEventLib.persistPinnedEventOnTimeline(
          frameworkRequest,
          null, // pinnedEventSavedObjectId
          eventId,
          timelineSavedObjectId,
          pinnedEventIds
        );
      })
    );
    const errorMsg = getCollectErrorMessages(createdPinnedEvents);
    if (errorMsg.length !== 0) {
      resolve(
        createBulkErrorObject({
          id: timelineSavedObjectId,
          statusCode: 500,
          message: errorMsg,
        })
      );
    }
  }
};

export const saveNotes = async (
  frameworkRequest,
  timelineSavedObjectId,
  timelineVersion = null,
  existingNoteIds = [],
  newNotes = [],
  resolve
) => {
  if (newNotes.length !== 0) {
    const createdNotes = await Promise.all(
      newNotes.map(note => {
        const newNote = {
          eventId: note.eventId,
          note: note.note,
          timelineId: timelineSavedObjectId,
        };
        return noteLib.persistNote(
          frameworkRequest,
          existingNoteIds.noteIds?.find(nId => nId === note.noteId) ?? null,
          timelineVersion,
          newNote
        );
      })
    );

    const errorMsg = getCollectErrorMessages(createdNotes);
    if (errorMsg.length !== 0) {
      resolve(
        createBulkErrorObject({
          id: timelineSavedObjectId,
          statusCode: 500,
          message: errorMsg,
        })
      );
    }
  }
};

export const createTimelines = async (
  frameworkRequest,
  timelineSavedObjectId = null,
  timelineVersion = null,
  timeline,
  pinnedEventIds = [],
  notes = [],
  existingNoteIds = [],
  resolve
) => {
  const newSavedObjectId = await saveTimelines(
    frameworkRequest,
    timelineSavedObjectId, // timeline SavedObjectId
    timelineVersion, // timeline version
    timeline,
    resolve
  );

  await savePinnedEvents(frameworkRequest, newSavedObjectId, pinnedEventIds, resolve);

  await saveNotes(
    frameworkRequest,
    newSavedObjectId,
    timelineVersion, // timelineVersion
    existingNoteIds, // existingNoteIds
    notes,
    resolve
  );

  resolve({ timeline_id: newSavedObjectId, status_code: 200 });
};
