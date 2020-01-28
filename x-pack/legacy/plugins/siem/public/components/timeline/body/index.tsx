/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useRef, useState, useCallback } from 'react';
import { AutoSizer, List, CellMeasurer, CellMeasurerCache } from 'react-virtualized';
import { VariableSizeList } from 'react-window';

import { BrowserFields } from '../../../containers/source';
import { TimelineItem, TimelineNonEcsData } from '../../../graphql/types';
import { Note } from '../../../lib/note';
import { AddNoteToEvent, UpdateNote } from '../../notes/helpers';
import {
  OnColumnRemoved,
  OnColumnResized,
  OnColumnSorted,
  OnFilterChange,
  OnPinEvent,
  OnRowSelected,
  OnSelectAll,
  OnUnPinEvent,
  OnUpdateColumns,
} from '../events';
import { EventsTable, TimelineBody, TimelineBodyGlobalStyle } from '../styles';
import { ColumnHeaders } from './column_headers';
import { ColumnHeader } from './column_headers/column_header';
import { eventIsPinned, getActionsColumnWidth } from './helpers';
import { ColumnRenderer } from './renderers/column_renderer';
import { RowRenderer } from './renderers/row_renderer';
import { Sort } from './sort';
import { useTimelineTypeContext } from '../timeline_context';
import { StatefulEvent } from './events/stateful_event';

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
  isSelectAllChecked: boolean;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  loadingEventIds: Readonly<string[]>;
  onColumnRemoved: OnColumnRemoved;
  onColumnResized: OnColumnResized;
  onColumnSorted: OnColumnSorted;
  onRowSelected: OnRowSelected;
  onSelectAll: OnSelectAll;
  onFilterChange: OnFilterChange;
  onPinEvent: OnPinEvent;
  onUpdateColumns: OnUpdateColumns;
  onUnPinEvent: OnUnPinEvent;
  pinnedEventIds: Readonly<Record<string, boolean>>;
  range: string;
  rowRenderers: RowRenderer[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  sort: Sort;
  toggleColumn: (column: ColumnHeader) => void;
  updateNote: UpdateNote;
}

const listRef = React.createRef<VariableSizeList>();

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
    isSelectAllChecked,
    loadingEventIds,
    onColumnRemoved,
    onColumnResized,
    onColumnSorted,
    onRowSelected,
    onSelectAll,
    onFilterChange,
    onPinEvent,
    onUpdateColumns,
    onUnPinEvent,
    pinnedEventIds,
    rowRenderers,
    selectedEventIds,
    showCheckboxes,
    sort,
    toggleColumn,
    updateNote,
  }) => {
    const timelineTypeContext = useTimelineTypeContext();
    const additionalActionWidth =
      timelineTypeContext.timelineActions?.reduce((acc, v) => acc + v.width, 0) ?? 0;

    const actionsColumnWidth = useMemo(
      () => getActionsColumnWidth(isEventViewer, showCheckboxes, additionalActionWidth),
      [isEventViewer, showCheckboxes, additionalActionWidth]
    );

    const columnWidths = useMemo(
      () =>
        columnHeaders.reduce((totalWidth, header) => totalWidth + header.width, actionsColumnWidth),
      [actionsColumnWidth, columnHeaders]
    );

    const rowHeights = [];

    const getItemSize = index => rowHeights[index] || 33;

    const Row = ({ index, style }) => {
      const ref = useRef();
      const event = data[index];
      const isEventPinned = eventIsPinned({
        eventId: event._id,
        pinnedEventIds,
      });

      const measure = useCallback(() => {
        if (ref && ref.current) {
          console.error('duopa', ref.current.getBoundingClientRect());
          rowHeights[index] = ref.current.getBoundingClientRect().height;
          console.error('ehig', rowHeights);
          listRef.current.resetAfterIndex(index);
        }
      }, [ref]);

      return (
        <div style={{ ...style, top: style.top + 33 }}>
          <div ref={ref}>
            <StatefulEvent
              actionsColumnWidth={actionsColumnWidth}
              addNoteToEvent={addNoteToEvent}
              browserFields={browserFields}
              columnHeaders={columnHeaders}
              columnRenderers={columnRenderers}
              event={event}
              eventIdToNoteIds={eventIdToNoteIds}
              getNotesByIds={getNotesByIds}
              isEventPinned={isEventPinned}
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
        </div>
      );
    };

    const innerElementType = ({ children, style }) => (
      <>
        <ColumnHeaders
          actionsColumnWidth={actionsColumnWidth}
          browserFields={browserFields}
          columnHeaders={columnHeaders}
          isEventViewer={isEventViewer}
          isSelectAllChecked={isSelectAllChecked}
          onColumnRemoved={onColumnRemoved}
          onColumnResized={onColumnResized}
          onColumnSorted={onColumnSorted}
          onFilterChange={onFilterChange}
          onSelectAll={onSelectAll}
          onUpdateColumns={onUpdateColumns}
          showEventsSelect={false}
          showSelectAllCheckbox={showCheckboxes}
          sort={sort}
          timelineId={id}
          toggleColumn={toggleColumn}
        />
        <div style={style}>{children}</div>
      </>
    );

    return (
      <>
        <VariableSizeList
          ref={listRef}
          height={height}
          itemCount={data.length}
          itemSize={getItemSize}
          innerElementType={innerElementType}
          width="100%"
          overscanCount={10}
        >
          {Row}
        </VariableSizeList>
        {/* <TimelineBody data-test-subj="timeline-body" bodyHeight={height}> */}

        {/* <EventsTable
            data-test-subj="events-table"
            // Passing the styles directly to the component because the width is being calculated and is recommended by Styled Components for performance: https://github.com/styled-components/styled-components/issues/134#issuecomment-312415291
            style={{ minWidth: `${columnWidths}px` }}
          >
            <ColumnHeaders
              actionsColumnWidth={actionsColumnWidth}
              browserFields={browserFields}
              columnHeaders={columnHeaders}
              isEventViewer={isEventViewer}
              isSelectAllChecked={isSelectAllChecked}
              onColumnRemoved={onColumnRemoved}
              onColumnResized={onColumnResized}
              onColumnSorted={onColumnSorted}
              onFilterChange={onFilterChange}
              onSelectAll={onSelectAll}
              onUpdateColumns={onUpdateColumns}
              showEventsSelect={false}
              showSelectAllCheckbox={showCheckboxes}
              sort={sort}
              timelineId={id}
              toggleColumn={toggleColumn}
            />

            <div style={{ flex: '1 1 auto' }}>
              <AutoSizer>
                {({ width }) => (
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
                                isEventPinned={eventIsPinned({
                                  eventId: event._id,
                                  pinnedEventIds,
                                })}
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
            </div>
          </EventsTable> */}
        {/* </TimelineBody> */}
        <TimelineBodyGlobalStyle />
      </>
    );
  }
);
Body.displayName = 'Body';
