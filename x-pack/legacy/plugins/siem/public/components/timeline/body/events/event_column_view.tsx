/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import uuid from 'uuid';

import { TimelineNonEcsData } from '../../../../graphql/types';
import { Note } from '../../../../lib/note';
import { AssociateNote, UpdateNote } from '../../../notes/helpers';
import { OnColumnResized, OnPinEvent, OnUnPinEvent } from '../../events';
import { EventsTrData } from '../../styles';
import { Actions } from '../actions';
import { ColumnHeader } from '../column_headers/column_header';
import { DataDrivenColumns } from '../data_driven_columns';
import { eventHasNotes, getPinOnClick } from '../helpers';
import { ColumnRenderer } from '../renderers/column_renderer';
import { useTimelineTypeContext } from '../../timeline_context';

interface Props {
  id: string;
  actionsColumnWidth: number;
  associateNote: AssociateNote;
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  data: TimelineNonEcsData[];
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  expanded: boolean;
  getNotesByIds: (noteIds: string[]) => Note[];
  isEventPinned: boolean;
  isEventViewer?: boolean;
  loading: boolean;
  onColumnResized: OnColumnResized;
  onEventToggled: () => void;
  onPinEvent: OnPinEvent;
  onUnPinEvent: OnUnPinEvent;
  showNotes: boolean;
  timelineId: string;
  toggleShowNotes: () => void;
  updateNote: UpdateNote;
}

export const getNewNoteId = (): string => uuid.v4();

const emptyNotes: string[] = [];

export const EventColumnView = React.memo<Props>(
  ({
    id,
    actionsColumnWidth,
    associateNote,
    columnHeaders,
    columnRenderers,
    data,
    eventIdToNoteIds,
    expanded,
    getNotesByIds,
    isEventPinned = false,
    isEventViewer = false,
    loading,
    onColumnResized,
    onEventToggled,
    onPinEvent,
    onUnPinEvent,
    showNotes,
    timelineId,
    toggleShowNotes,
    updateNote,
  }) => {
    const timelineTypeContext = useTimelineTypeContext();

    return (
      <EventsTrData data-test-subj="event-column-view">
        <Actions
          actionsColumnWidth={actionsColumnWidth}
          associateNote={associateNote}
          checked={false}
          expanded={expanded}
          data-test-subj="actions"
          eventId={id}
          eventIsPinned={isEventPinned}
          getNotesByIds={getNotesByIds}
          isEventViewer={isEventViewer}
          loading={loading}
          noteIds={eventIdToNoteIds[id] || emptyNotes}
          onEventToggled={onEventToggled}
          onPinClicked={getPinOnClick({
            allowUnpinning: !eventHasNotes(eventIdToNoteIds[id]),
            eventId: id,
            onPinEvent,
            onUnPinEvent,
            isEventPinned,
          })}
          showCheckboxes={timelineTypeContext.showCheckboxes}
          showNotes={showNotes}
          toggleShowNotes={toggleShowNotes}
          updateNote={updateNote}
        />

        <DataDrivenColumns
          _id={id}
          columnHeaders={columnHeaders}
          columnRenderers={columnRenderers}
          data={data}
          onColumnResized={onColumnResized}
          timelineId={timelineId}
        />
      </EventsTrData>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.id === nextProps.id &&
      prevProps.actionsColumnWidth === nextProps.actionsColumnWidth &&
      prevProps.columnHeaders === nextProps.columnHeaders &&
      prevProps.columnRenderers === nextProps.columnRenderers &&
      prevProps.data === nextProps.data &&
      prevProps.eventIdToNoteIds === nextProps.eventIdToNoteIds &&
      prevProps.expanded === nextProps.expanded &&
      prevProps.loading === nextProps.loading &&
      prevProps.isEventPinned === nextProps.isEventPinned &&
      prevProps.showNotes === nextProps.showNotes &&
      prevProps.timelineId === nextProps.timelineId
    );
  }
);
EventColumnView.displayName = 'EventColumnView';
