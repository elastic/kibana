/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import uuid from 'uuid';

import { TimelineNonEcsData, Ecs } from '../../../../graphql/types';
import { Note } from '../../../../lib/note';
import { ColumnHeaderOptions } from '../../../../store/timeline/model';
import { AddNoteToEvent, UpdateNote } from '../../../notes/helpers';
import { NoteCards } from '../../../notes/note_cards';
import { OnPinEvent, OnColumnResized, OnUnPinEvent, OnRowSelected } from '../../events';
import { EventsTrSupplement, OFFSET_SCROLLBAR } from '../../styles';
import { useTimelineWidthContext } from '../../timeline_context';
import { ColumnRenderer } from '../renderers/column_renderer';
import { EventColumnView } from './event_column_view';

interface Props {
  id: string;
  actionsColumnWidth: number;
  addNoteToEvent: AddNoteToEvent;
  onPinEvent: OnPinEvent;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  data: TimelineNonEcsData[];
  ecsData: Ecs;
  expanded: boolean;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  isEventViewer?: boolean;
  isEventPinned: boolean;
  loading: boolean;
  loadingEventIds: Readonly<string[]>;
  onColumnResized: OnColumnResized;
  onRowSelected: OnRowSelected;
  onUnPinEvent: OnUnPinEvent;
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  showNotes: boolean;
  timelineId: string;
  updateNote: UpdateNote;
  onToggleExpanded: () => void;
  onToggleShowNotes: () => void;
  getNotesByIds: (noteIds: string[]) => Note[];
  associateNote: (noteId: string) => void;
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
    ecsData,
    eventIdToNoteIds,
    getNotesByIds,
    isEventViewer = false,
    isEventPinned = false,
    loading,
    loadingEventIds,
    onColumnResized,
    onRowSelected,
    onToggleExpanded,
    onUnPinEvent,
    selectedEventIds,
    showCheckboxes,
    showNotes,
    timelineId,
    onToggleShowNotes,
    updateNote,
  }) => {
    const width = useTimelineWidthContext();

    // Passing the styles directly to the component because the width is
    // being calculated and is recommended by Styled Components for performance
    // https://github.com/styled-components/styled-components/issues/134#issuecomment-312415291
    return (
      <>
        <EventColumnView
          id={id}
          actionsColumnWidth={actionsColumnWidth}
          associateNote={associateNote}
          columnHeaders={columnHeaders}
          columnRenderers={columnRenderers}
          data={data}
          ecsData={ecsData}
          expanded={expanded}
          eventIdToNoteIds={eventIdToNoteIds}
          getNotesByIds={getNotesByIds}
          isEventPinned={isEventPinned}
          isEventViewer={isEventViewer}
          loading={loading}
          loadingEventIds={loadingEventIds}
          onColumnResized={onColumnResized}
          onEventToggled={onToggleExpanded}
          onPinEvent={onPinEvent}
          onRowSelected={onRowSelected}
          onUnPinEvent={onUnPinEvent}
          selectedEventIds={selectedEventIds}
          showCheckboxes={showCheckboxes}
          showNotes={showNotes}
          timelineId={timelineId}
          toggleShowNotes={onToggleShowNotes}
          updateNote={updateNote}
        />

        <EventsTrSupplement
          className="siemEventsTable__trSupplement--notes"
          data-test-subj="event-notes-flex-item"
          style={{ width: `${width - OFFSET_SCROLLBAR}px` }}
        >
          <NoteCards
            associateNote={associateNote}
            data-test-subj="note-cards"
            getNewNoteId={getNewNoteId}
            getNotesByIds={getNotesByIds}
            noteIds={eventIdToNoteIds[id] || emptyNotes}
            showAddNote={showNotes}
            toggleShowAddNote={onToggleShowNotes}
            updateNote={updateNote}
          />
        </EventsTrSupplement>
      </>
    );
  }
);
StatefulEventChild.displayName = 'StatefulEventChild';
