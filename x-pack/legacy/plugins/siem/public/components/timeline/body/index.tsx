/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { BrowserFields } from '../../../containers/source';
import { TimelineItem } from '../../../graphql/types';
import { Note } from '../../../lib/note';
import { AddNoteToEvent, UpdateNote } from '../../notes/helpers';
import {
  OnColumnRemoved,
  OnColumnResized,
  OnColumnSorted,
  OnFilterChange,
  OnPinEvent,
  OnUnPinEvent,
  OnUpdateColumns,
} from '../events';
import { EventsTable } from '../styles';
import { ColumnHeaders } from './column_headers';
import { ColumnHeader } from './column_headers/column_header';
import { Events } from './events';
import { getActionsColumnWidth } from './helpers';
import { ColumnRenderer } from './renderers/column_renderer';
import { RowRenderer } from './renderers/row_renderer';
import { Sort } from './sort';

export interface BodyProps {
  addNoteToEvent: AddNoteToEvent;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  data: TimelineItem[];
  getNotesByIds: (noteIds: string[]) => Note[];
  height: number;
  id: string;
  isEventViewer?: boolean;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  onColumnRemoved: OnColumnRemoved;
  onColumnResized: OnColumnResized;
  onColumnSorted: OnColumnSorted;
  onFilterChange: OnFilterChange;
  onPinEvent: OnPinEvent;
  onUpdateColumns: OnUpdateColumns;
  onUnPinEvent: OnUnPinEvent;
  pinnedEventIds: Readonly<Record<string, boolean>>;
  range: string;
  rowRenderers: RowRenderer[];
  sort: Sort;
  toggleColumn: (column: ColumnHeader) => void;
  updateNote: UpdateNote;
}

/** Renders the timeline body */
export const Body = React.memo<BodyProps>(
  ({
    addNoteToEvent,
    browserFields,
    columnHeaders,
    columnRenderers,
    data,
    eventIdToNoteIds,
    getNotesByIds,
    height,
    id,
    isEventViewer = false,
    onColumnRemoved,
    onColumnResized,
    onColumnSorted,
    onFilterChange,
    onPinEvent,
    onUpdateColumns,
    onUnPinEvent,
    pinnedEventIds,
    rowRenderers,
    sort,
    toggleColumn,
    updateNote,
  }) => {
    const columnWidths = columnHeaders.reduce(
      (totalWidth, header) => totalWidth + header.width,
      getActionsColumnWidth(isEventViewer)
    );

    return (
      <EventsTable tableHeight={height}>
        <ColumnHeaders
          actionsColumnWidth={getActionsColumnWidth(isEventViewer)}
          browserFields={browserFields}
          columnHeaders={columnHeaders}
          isEventViewer={isEventViewer}
          onColumnRemoved={onColumnRemoved}
          onColumnResized={onColumnResized}
          onColumnSorted={onColumnSorted}
          onFilterChange={onFilterChange}
          onUpdateColumns={onUpdateColumns}
          showEventsSelect={false}
          sort={sort}
          timelineId={id}
          toggleColumn={toggleColumn}
          minWidth={columnWidths}
        />

        <Events
          actionsColumnWidth={getActionsColumnWidth(isEventViewer)}
          addNoteToEvent={addNoteToEvent}
          browserFields={browserFields}
          columnHeaders={columnHeaders}
          columnRenderers={columnRenderers}
          data={data}
          eventIdToNoteIds={eventIdToNoteIds}
          getNotesByIds={getNotesByIds}
          id={id}
          isEventViewer={isEventViewer}
          onColumnResized={onColumnResized}
          onPinEvent={onPinEvent}
          onUpdateColumns={onUpdateColumns}
          onUnPinEvent={onUnPinEvent}
          pinnedEventIds={pinnedEventIds}
          rowRenderers={rowRenderers}
          toggleColumn={toggleColumn}
          updateNote={updateNote}
          minWidth={columnWidths}
        />
      </EventsTable>
    );
  }
);
Body.displayName = 'Body';
