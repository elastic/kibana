/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { keys } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import { createSelector } from 'reselect';

import { Note } from '../../lib/note';
import { State } from '../reducer';

import { ErrorModel, NotesById } from './model';

const selectNotesById = (state: State): NotesById => state.app.notesById;

const getErrors = (state: State): ErrorModel => state.app.errors;

const getNotes = (notesById: NotesById, noteIds: string[]) =>
  keys(notesById).reduce((acc: Note[], noteId: string) => {
    if (noteIds.includes(noteId)) {
      const note: Note = notesById[noteId];
      return [...acc, note];
    }
    return acc;
  }, []);

export const selectNotesByIdSelector = createSelector(
  selectNotesById,
  (notesById: NotesById) => notesById
);

export const notesByIdsSelector = () =>
  createSelector(
    selectNotesById,
    (notesById: NotesById) =>
      memoizeOne((noteIds: string[]): Note[] => getNotes(notesById, noteIds))
  );

export const errorsSelector = () =>
  createSelector(
    getErrors,
    errors => ({ errors })
  );
