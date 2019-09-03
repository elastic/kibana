/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { Note } from '../../lib/note';

import { addError, addNotes, removeError, updateNote } from './actions';
import { AppModel, NotesById } from './model';

export type AppState = AppModel;

export const initialAppState: AppState = {
  notesById: {},
  errors: [],
};

interface UpdateNotesByIdParams {
  note: Note;
  notesById: NotesById;
}

export const updateNotesById = ({ note, notesById }: UpdateNotesByIdParams): NotesById => ({
  ...notesById,
  [note.id]: note,
});

export const appReducer = reducerWithInitialState(initialAppState)
  .case(addNotes, (state, { notes }) => ({
    ...state,
    notesById: notes.reduce<NotesById>((acc, note: Note) => ({ ...acc, [note.id]: note }), {}),
  }))
  .case(updateNote, (state, { note }) => ({
    ...state,
    notesById: updateNotesById({ note, notesById: state.notesById }),
  }))
  .case(addError, (state, { id, title, message }) => ({
    ...state,
    errors: state.errors.concat({ id, title, message }),
  }))
  .case(removeError, (state, { id }) => ({
    ...state,
    errors: state.errors.filter(error => error.id !== id),
  }))
  .build();
