/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { AutoSizer, List, CellMeasurer, CellMeasurerCache } from 'react-virtualized';

import { BrowserFields } from '../../../../containers/source';
import { TimelineItem, TimelineNonEcsData } from '../../../../graphql/types';
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

const listCache = new CellMeasurerCache({
  fixedWidth: true,
  defaultHeight: 32,
});

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
const EventsComponent: React.FC<Props> = ({
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
  <AutoSizer>
    {({ height, width }) => (
      <List
        height={height}
        width={width}
        rowHeight={listCache.rowHeight}
        rowCount={data.length}
        deferredMeasurementCache={listCache}
        overscanRowCount={10}
        rowRenderer={({ index, key, style, parent }) => {
          const event = data[index];
          return (
            <CellMeasurer
              key={key}
              cache={listCache}
              parent={parent}
              columnIndex={0}
              rowIndex={index}
            >
              {({ measure }) => (
                <div style={{ ...style, overflow: 'hidden' }}>
                  <StatefulEvent
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
                    key={event._id}
                    loadingEventIds={loadingEventIds}
                    onColumnResized={onColumnResized}
                    onPinEvent={onPinEvent}
                    onRowSelected={onRowSelected}
                    onUnPinEvent={onUnPinEvent}
                    onUpdateColumns={onUpdateColumns}
                    rowRenderers={rowRenderers}
                    selectedEventIds={selectedEventIds}
                    showCheckboxes={showCheckboxes}
                    timelineId={id}
                    toggleColumn={toggleColumn}
                    updateNote={updateNote}
                    measure={measure}
                  />
                </div>
              )}
            </CellMeasurer>
          );
        }}
      />
    )}
  </AutoSizer>
);

export const Events = React.memo(EventsComponent);
