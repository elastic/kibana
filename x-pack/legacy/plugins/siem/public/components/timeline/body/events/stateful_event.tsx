/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, useCallback } from 'react';
import uuid from 'uuid';

import { BrowserFields } from '../../../../containers/source';
import { TimelineDetailsQuery } from '../../../../containers/timeline/details';
import { TimelineItem, DetailItem, TimelineNonEcsData } from '../../../../graphql/types';
import { Note } from '../../../../lib/note';
import { AddNoteToEvent, UpdateNote } from '../../../notes/helpers';
// import { SkeletonRow } from '../../../skeleton_row';
import {
  OnColumnResized,
  OnPinEvent,
  OnRowSelected,
  OnUnPinEvent,
  OnUpdateColumns,
} from '../../events';
import { STATEFUL_EVENT_CSS_CLASS_NAME } from '../../helpers';
import { EventsTrGroup, EventsTrSupplement, OFFSET_SCROLLBAR } from '../../styles';
import { useTimelineWidthContext } from '../../timeline_context';
import { ColumnHeader } from '../column_headers/column_header';
import { ColumnRenderer } from '../renderers/column_renderer';
import { getRowRenderer } from '../renderers/get_row_renderer';
import { RowRenderer } from '../renderers/row_renderer';
import { getEventType } from '../helpers';
import { StatefulEventChild } from './stateful_event_child';
import { StatefulEventDetails } from '../../../event_details/stateful_event_details';

interface Props {
  actionsColumnWidth: number;
  addNoteToEvent: AddNoteToEvent;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  event: TimelineItem;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  getNotesByIds: (noteIds: string[]) => Note[];
  isEventViewer?: boolean;
  loadingEventIds: Readonly<string[]>;
  maxDelay?: number;
  onColumnResized: OnColumnResized;
  onPinEvent: OnPinEvent;
  onRowSelected: OnRowSelected;
  onUnPinEvent: OnUnPinEvent;
  onUpdateColumns: OnUpdateColumns;
  isEventPinned: boolean;
  rowRenderers: RowRenderer[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  timelineId: string;
  toggleColumn: (column: ColumnHeader) => void;
  updateNote: UpdateNote;
  measure: () => void;
}

export const getNewNoteId = (): string => uuid.v4();

const emptyDetails: DetailItem[] = [];

interface AttributesProps {
  children: React.ReactNode;
}

const AttributesComponent: React.FC<AttributesProps> = ({ children }) => {
  const width = useTimelineWidthContext();

  // Passing the styles directly to the component because the width is
  // being calculated and is recommended by Styled Components for performance
  // https://github.com/styled-components/styled-components/issues/134#issuecomment-312415291
  return (
    <EventsTrSupplement
      className="siemEventsTable__trSupplement--attributes"
      data-test-subj="event-details"
      style={{ width: `${width - OFFSET_SCROLLBAR}px` }}
    >
      {children}
    </EventsTrSupplement>
  );
};

const Attributes = React.memo(AttributesComponent);

const MeasureComponent = ({ measure }: { measure: () => void }) => {
  useEffect(() => measure(), []);
  return null;
};

const StatefulEventComponent: React.FC<Props> = ({
  actionsColumnWidth,
  addNoteToEvent,
  browserFields,
  columnHeaders,
  columnRenderers,
  event,
  eventIdToNoteIds,
  getNotesByIds,
  isEventViewer = false,
  isEventPinned = false,
  loadingEventIds,
  onColumnResized,
  onPinEvent,
  onRowSelected,
  onUnPinEvent,
  onUpdateColumns,
  rowRenderers,
  selectedEventIds,
  showCheckboxes,
  timelineId,
  toggleColumn,
  updateNote,
  measure,
}) => {
  const [expanded, setExpanded] = useState<{ [eventId: string]: boolean }>({});
  const [showNotes, setShowNotes] = useState<{ [eventId: string]: boolean }>({});

  const onToggleShowNotes = useCallback(() => {
    const eventId = event._id;
    setShowNotes({ ...showNotes, [eventId]: !showNotes[eventId] });
  }, [event, showNotes]);

  const onToggleExpanded = useCallback(() => {
    const eventId = event._id;
    setExpanded({
      ...expanded,
      [eventId]: !expanded[eventId],
    });
  }, [event, expanded]);

  const associateNote = useCallback(
    (noteId: string) => {
      addNoteToEvent({ eventId: event._id, noteId });
      if (!isEventPinned) {
        onPinEvent(event._id); // pin the event, because it has notes
      }
    },
    [addNoteToEvent, event, isEventPinned, onPinEvent]
  );

  return (
    <TimelineDetailsQuery
      sourceId="default"
      indexName={event._index!}
      eventId={event._id}
      executeQuery={!!expanded[event._id]}
    >
      {({ detailsData, loading }) => (
        <EventsTrGroup
          className={STATEFUL_EVENT_CSS_CLASS_NAME}
          data-test-subj="event"
          eventType={getEventType(event.ecs)}
          showLeftBorder={!isEventViewer}
        >
          {getRowRenderer(event.ecs, rowRenderers).renderRow({
            browserFields,
            data: event.ecs,
            children: (
              <StatefulEventChild
                actionsColumnWidth={actionsColumnWidth}
                addNoteToEvent={addNoteToEvent}
                associateNote={associateNote}
                columnHeaders={columnHeaders}
                columnRenderers={columnRenderers}
                data={event.data}
                ecsData={event.ecs}
                eventIdToNoteIds={eventIdToNoteIds}
                expanded={!!expanded[event._id]}
                getNotesByIds={getNotesByIds}
                id={event._id}
                isEventPinned={isEventPinned}
                isEventViewer={isEventViewer}
                loading={loading}
                loadingEventIds={loadingEventIds}
                onColumnResized={onColumnResized}
                onPinEvent={onPinEvent}
                onRowSelected={onRowSelected}
                onToggleExpanded={onToggleExpanded}
                onToggleShowNotes={onToggleShowNotes}
                onUnPinEvent={onUnPinEvent}
                selectedEventIds={selectedEventIds}
                showCheckboxes={showCheckboxes}
                showNotes={!!showNotes[event._id]}
                timelineId={timelineId}
                updateNote={updateNote}
              />
            ),
            timelineId,
          })}

          {!!expanded[event._id] && !loading ? (
            <Attributes>
              <StatefulEventDetails
                browserFields={browserFields}
                columnHeaders={columnHeaders}
                data={detailsData || emptyDetails}
                id={(detailsData || emptyDetails)._id}
                onUpdateColumns={onUpdateColumns}
                timelineId={timelineId}
                toggleColumn={toggleColumn}
              />
              <MeasureComponent measure={measure} />
            </Attributes>
          ) : (
            <MeasureComponent measure={measure} />
          )}
        </EventsTrGroup>
      )}
    </TimelineDetailsQuery>
  );
};

export const StatefulEvent = React.memo(StatefulEventComponent);
