/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import uuid from 'uuid';

import { EventColumnView } from './event_column_view';

import { ColumnHeader } from '../column_headers/column_header';
import { ColumnRenderer } from '../renderers/column_renderer';
import { OnPinEvent, OnColumnResized, OnUnPinEvent } from '../../events';
import { AddNoteToEvent, UpdateNote } from '../../../notes/helpers';
import { NoteCards } from '../../../notes/note_cards';
import { TimelineNonEcsData } from '../../../../graphql/types';
import { Note } from '../../../../lib/note';

interface Props {
  id: string;
  actionsColumnWidth: number;
  addNoteToEvent: AddNoteToEvent;
  onPinEvent: OnPinEvent;
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  data: TimelineNonEcsData[];
  expanded: boolean;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  isEventViewer?: boolean;
  loading: boolean;
  onColumnResized: OnColumnResized;
  onUnPinEvent: OnUnPinEvent;
  pinnedEventIds: Readonly<Record<string, boolean>>;
  showNotes: boolean;
  updateNote: UpdateNote;
  onToggleExpanded: (eventId: string) => () => void;
  onToggleShowNotes: (eventId: string) => () => void;
  getNotesByIds: (noteIds: string[]) => Note[];
  associateNote: (
    eventId: string,
    addNoteToEvent: AddNoteToEvent,
    onPinEvent: OnPinEvent
  ) => (noteId: string) => void;
}

export const getNewNoteId = (): string => uuid.v4();

const emptyNotes: string[] = [];

export const StatefulEventChild = React.memo<Props>(
  ({
    id,
    actionsColumnWidth,
    associateNote,
    addNoteToEvent,
    onPinEvent,
    columnHeaders,
    columnRenderers,
    expanded,
    data,
    eventIdToNoteIds,
    getNotesByIds,
    isEventViewer = false,
    loading,
    onColumnResized,
    onToggleExpanded,
    onUnPinEvent,
    pinnedEventIds,
    showNotes,
    onToggleShowNotes,
    updateNote,
  }) => (
    <div data-test-subj="event-rows">
      <div data-test-subj="event-column-data">
        <EventColumnView
          id={id}
          actionsColumnWidth={actionsColumnWidth}
          associateNote={associateNote(id, addNoteToEvent, onPinEvent)}
          columnHeaders={columnHeaders}
          columnRenderers={columnRenderers}
          data={data}
          expanded={expanded}
          eventIdToNoteIds={eventIdToNoteIds}
          getNotesByIds={getNotesByIds}
          isEventViewer={isEventViewer}
          loading={loading}
          onColumnResized={onColumnResized}
          onEventToggled={onToggleExpanded(id)}
          onPinEvent={onPinEvent}
          onUnPinEvent={onUnPinEvent}
          pinnedEventIds={pinnedEventIds}
          showNotes={showNotes}
          toggleShowNotes={onToggleShowNotes(id)}
          updateNote={updateNote}
        />
      </div>

      <div data-test-subj="event-notes-flex-item">
        <NoteCards
          associateNote={associateNote(id, addNoteToEvent, onPinEvent)}
          data-test-subj="note-cards"
          getNewNoteId={getNewNoteId}
          getNotesByIds={getNotesByIds}
          noteIds={eventIdToNoteIds[id] || emptyNotes}
          showAddNote={showNotes}
          toggleShowAddNote={onToggleShowNotes(id)}
          updateNote={updateNote}
        />
      </div>
    </div>
  )
);

StatefulEventChild.displayName = 'StatefulEventChild';
