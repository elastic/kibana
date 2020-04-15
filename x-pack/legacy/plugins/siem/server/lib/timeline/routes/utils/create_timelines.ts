/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Timeline } from '../../saved_object';
import { PinnedEvent } from '../../../pinned_event/saved_object';
import { Note } from '../../../note/saved_object';
import { FrameworkRequest } from '../../../framework';
import { SavedTimeline } from '../../types';
import { NoteResult } from '../../../../../public/graphql/types';
import { SavedNote } from '../../../note/types';

const pinnedEventLib = new PinnedEvent();
const timelineLib = new Timeline();
const noteLib = new Note();
export const saveTimelines = async (
  frameworkRequest: FrameworkRequest,
  timeline: SavedTimeline,
  timelineSavedObjectId?: string | null,
  timelineVersion?: string | null
) => {
  const newTimelineRes = await timelineLib.persistTimeline(
    frameworkRequest,
    timelineSavedObjectId ?? null,
    timelineVersion ?? null,
    timeline
  );

  return {
    newTimelineSavedObjectId: newTimelineRes?.timeline?.savedObjectId ?? null,
    newTimelineVersion: newTimelineRes?.timeline?.version ?? null,
  };
};

export const savePinnedEvents = (
  frameworkRequest: FrameworkRequest,
  timelineSavedObjectId: string,
  pinnedEventIds?: string[] | null
) => {
  return (
    pinnedEventIds?.map(eventId => {
      return pinnedEventLib.persistPinnedEventOnTimeline(
        frameworkRequest,
        null, // pinnedEventSavedObjectId
        eventId,
        timelineSavedObjectId
      );
    }) ?? []
  );
};

export const saveNotes = (
  frameworkRequest: FrameworkRequest,
  timelineSavedObjectId: string,
  timelineVersion?: string | null,
  existingNoteIds?: string[],
  newNotes?: NoteResult[]
) => {
  return Promise.all(
    newNotes?.map(note => {
      const newNote: SavedNote = {
        eventId: note.eventId,
        note: note.note,
        timelineId: timelineSavedObjectId,
      };

      return noteLib.persistNote(
        frameworkRequest,
        existingNoteIds?.find(nId => nId === note.noteId) ?? null,
        timelineVersion ?? null,
        newNote
      );
    }) ?? []
  );
};

export const createTimelines = async (
  frameworkRequest: FrameworkRequest,
  timeline: SavedTimeline,
  timelineSavedObjectId?: string | null,
  timelineVersion?: string | null,
  pinnedEventIds?: string[] | null,
  notes?: NoteResult[],
  existingNoteIds?: string[]
) => {
  const { newTimelineSavedObjectId, newTimelineVersion } = await saveTimelines(
    frameworkRequest,
    timeline,
    timelineSavedObjectId,
    timelineVersion
  );
  await Promise.all([
    savePinnedEvents(
      frameworkRequest,
      timelineSavedObjectId ?? newTimelineSavedObjectId,
      pinnedEventIds
    ),
    saveNotes(
      frameworkRequest,
      timelineSavedObjectId ?? newTimelineSavedObjectId,
      newTimelineVersion,
      existingNoteIds,
      notes
    ),
  ]);

  return newTimelineSavedObjectId;
};

export const getTimeline = async (frameworkRequest: FrameworkRequest, savedObjectId: string) => {
  let timeline = null;
  try {
    timeline = await timelineLib.getTimeline(frameworkRequest, savedObjectId);
    // eslint-disable-next-line no-empty
  } catch (e) {}
  return timeline;
};
