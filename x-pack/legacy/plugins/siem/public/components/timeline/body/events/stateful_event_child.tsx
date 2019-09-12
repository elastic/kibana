/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import uuid from 'uuid';
import { EventColumnView } from './event_column_view';
import { AddNoteToEvent, UpdateNote } from '../../../notes/helpers';
import { OnPinEvent, OnColumnResized, OnUnPinEvent } from '../../events';
import { ColumnHeader } from '../column_headers/column_header';
import { ColumnRenderer } from '../renderers/column_renderer';
import { TimelineNonEcsData } from '../../../../graphql/types';
import { Note } from '../../../../lib/note';
import { NoteCards } from '../../../notes/note_cards';

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
  timelineId: string;
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
    timelineId,
    onToggleShowNotes,
    updateNote,
  }) => (
    <EuiFlexGroup data-test-subj="event-rows" direction="column" gutterSize="none">
      <EuiFlexItem data-test-subj="event-column-data" grow={false}>
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
          timelineId={timelineId}
          toggleShowNotes={onToggleShowNotes(id)}
          updateNote={updateNote}
        />
      </EuiFlexItem>

      <EuiFlexItem data-test-subj="event-notes-flex-item" grow={false}>
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
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);

StatefulEventChild.displayName = 'StatefulEventChild';
