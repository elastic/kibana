/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { BrowserFields } from '../../../../containers/source';
import { TimelineItem, TimelineNonEcsData } from '../../../../graphql/types';
import { maxDelay } from '../../../../lib/helpers/scheduler';
import { Note } from '../../../../lib/note';
import { AddNoteToEvent, UpdateNote } from '../../../notes/helpers';
import {
  OnColumnResized,
  OnPinEvent,
  OnRowSelected,
  OnUnPinEvent,
  OnUpdateColumns,
} from '../../events';
import { EventsTbody } from '../../styles';
import { ColumnHeader } from '../column_headers/column_header';
import { ColumnRenderer } from '../renderers/column_renderer';
import { RowRenderer } from '../renderers/row_renderer';
import { StatefulEvent } from './stateful_event';
import { eventIsPinned } from '../helpers';

interface Props {
  actionsColumnWidth: number;
  addNoteToEvent: AddNoteToEvent;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  data: TimelineItem[];
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  getNotesByIds: (noteIds: string[]) => Note[];
  id: string;
  isEventViewer?: boolean;
  loadingEventIds: Readonly<string[]>;
  onColumnResized: OnColumnResized;
  onPinEvent: OnPinEvent;
  onRowSelected: OnRowSelected;
  onUpdateColumns: OnUpdateColumns;
  onUnPinEvent: OnUnPinEvent;
  pinnedEventIds: Readonly<Record<string, boolean>>;
  rowRenderers: RowRenderer[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  toggleColumn: (column: ColumnHeader) => void;
  updateNote: UpdateNote;
}

// Passing the styles directly to the component because the width is
// being calculated and is recommended by Styled Components for performance
// https://github.com/styled-components/styled-components/issues/134#issuecomment-312415291
export const Events = React.memo<Props>(
  ({
    actionsColumnWidth,
    addNoteToEvent,
    browserFields,
    columnHeaders,
    columnRenderers,
    data,
    eventIdToNoteIds,
    getNotesByIds,
    id,
    isEventViewer = false,
    loadingEventIds,
    onColumnResized,
    onPinEvent,
    onRowSelected,
    onUpdateColumns,
    onUnPinEvent,
    pinnedEventIds,
    rowRenderers,
    selectedEventIds,
    showCheckboxes,
    toggleColumn,
    updateNote,
  }) => (
    <EventsTbody data-test-subj="events">
      {data.map((event, i) => (
        <StatefulEvent
          key={event._id}
          actionsColumnWidth={actionsColumnWidth}
          addNoteToEvent={addNoteToEvent}
          browserFields={browserFields}
          columnHeaders={columnHeaders}
          columnRenderers={columnRenderers}
          event={event}
          eventIdToNoteIds={eventIdToNoteIds}
          getNotesByIds={getNotesByIds}
          isEventPinned={eventIsPinned({ eventId: event._id, pinnedEventIds })}
          isEventViewer={isEventViewer}
          loadingEventIds={loadingEventIds}
          maxDelay={maxDelay(i)}
          rowRenderers={rowRenderers}
          selectedEventIds={selectedEventIds}
          showCheckboxes={showCheckboxes}
          timelineId={id}
          toggleColumn={toggleColumn}
          updateNote={updateNote}
          onColumnResized={onColumnResized}
          onPinEvent={onPinEvent}
          onRowSelected={onRowSelected}
          onUnPinEvent={onUnPinEvent}
          onUpdateColumns={onUpdateColumns}
        />
      ))}
    </EventsTbody>
  )
);
Events.displayName = 'Events';
