/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import uuid from 'uuid';

import { TimelineNonEcsData, Ecs } from '../../../../graphql/types';
import { Note } from '../../../../lib/note';
import { ColumnHeaderOptions } from '../../../../store/timeline/model';
import { AssociateNote, UpdateNote } from '../../../notes/helpers';
import { OnColumnResized, OnPinEvent, OnRowSelected, OnUnPinEvent } from '../../events';
import { EventsTdContent, EventsTrData } from '../../styles';
import { Actions } from '../actions';
import { DataDrivenColumns } from '../data_driven_columns';
import { eventHasNotes, getPinOnClick } from '../helpers';
import { ColumnRenderer } from '../renderers/column_renderer';
import { useTimelineTypeContext } from '../../timeline_context';

interface Props {
  id: string;
  actionsColumnWidth: number;
  associateNote: AssociateNote;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  data: TimelineNonEcsData[];
  ecsData: Ecs;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  expanded: boolean;
  getNotesByIds: (noteIds: string[]) => Note[];
  isEventPinned: boolean;
  isEventViewer?: boolean;
  loading: boolean;
  loadingEventIds: Readonly<string[]>;
  onColumnResized: OnColumnResized;
  onEventToggled: () => void;
  onPinEvent: OnPinEvent;
  onRowSelected: OnRowSelected;
  onUnPinEvent: OnUnPinEvent;
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
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
    ecsData,
    eventIdToNoteIds,
    expanded,
    getNotesByIds,
    isEventPinned = false,
    isEventViewer = false,
    loading,
    loadingEventIds,
    onColumnResized,
    onEventToggled,
    onPinEvent,
    onRowSelected,
    onUnPinEvent,
    selectedEventIds,
    showCheckboxes,
    showNotes,
    timelineId,
    toggleShowNotes,
    updateNote,
  }) => {
    const timelineTypeContext = useTimelineTypeContext();

    const additionalActions = useMemo<JSX.Element[]>(() => {
      return (
        timelineTypeContext.timelineActions?.map(action => (
          <EventsTdContent key={action.id} textAlign="center">
            {action.getAction({ eventId: id, ecsData })}
          </EventsTdContent>
        )) ?? []
      );
    }, [ecsData, timelineTypeContext.timelineActions]);

    return (
      <EventsTrData data-test-subj="event-column-view">
        <Actions
          actionsColumnWidth={actionsColumnWidth}
          additionalActions={additionalActions}
          associateNote={associateNote}
          checked={Object.keys(selectedEventIds).includes(id)}
          onRowSelected={onRowSelected}
          expanded={expanded}
          data-test-subj="actions"
          eventId={id}
          eventIsPinned={isEventPinned}
          getNotesByIds={getNotesByIds}
          isEventViewer={isEventViewer}
          loading={loading}
          loadingEventIds={loadingEventIds}
          noteIds={eventIdToNoteIds[id] || emptyNotes}
          onEventToggled={onEventToggled}
          onPinClicked={getPinOnClick({
            allowUnpinning: !eventHasNotes(eventIdToNoteIds[id]),
            eventId: id,
            onPinEvent,
            onUnPinEvent,
            isEventPinned,
          })}
          showCheckboxes={showCheckboxes}
          showNotes={showNotes}
          toggleShowNotes={toggleShowNotes}
          updateNote={updateNote}
        />

        <DataDrivenColumns
          _id={id}
          columnHeaders={columnHeaders}
          columnRenderers={columnRenderers}
          data={data}
          ecsData={ecsData}
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
      prevProps.loadingEventIds === nextProps.loadingEventIds &&
      prevProps.isEventPinned === nextProps.isEventPinned &&
      prevProps.onRowSelected === nextProps.onRowSelected &&
      prevProps.selectedEventIds === nextProps.selectedEventIds &&
      prevProps.showCheckboxes === nextProps.showCheckboxes &&
      prevProps.showNotes === nextProps.showNotes &&
      prevProps.timelineId === nextProps.timelineId
    );
  }
);
EventColumnView.displayName = 'EventColumnView';
