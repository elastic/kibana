/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import React, { useCallback, useEffect } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { BrowserFields } from '../../../containers/source';
import { TimelineItem } from '../../../graphql/types';
import { Note } from '../../../lib/note';
import { appSelectors, State, timelineSelectors } from '../../../store';
import { AddNoteToEvent, UpdateNote } from '../../notes/helpers';
import {
  OnColumnRemoved,
  OnColumnResized,
  OnColumnSorted,
  OnPinEvent,
  OnRowSelected,
  OnSelectAll,
  OnUnPinEvent,
  OnUpdateColumns,
} from '../events';

import { ColumnHeader } from './column_headers/column_header';
import { getColumnHeaders, getEventIdToDataMapping } from './helpers';
import { Body } from './index';
import { columnRenderers, rowRenderers } from './renderers';
import { Sort } from './sort';
import { timelineActions, appActions } from '../../../store/actions';
import { timelineDefaults, TimelineModel } from '../../../store/timeline/model';
import { plainRowRenderer } from './renderers/plain_row_renderer';
import { useTimelineTypeContext } from '../timeline_context';

interface OwnProps {
  browserFields: BrowserFields;
  data: TimelineItem[];
  id: string;
  isEventViewer?: boolean;
  height: number;
  sort: Sort;
  toggleColumn: (column: ColumnHeader) => void;
}

type StatefulBodyComponentProps = OwnProps & StatefulBodyReduxProps;

export const emptyColumnHeaders: ColumnHeader[] = [];

const StatefulBodyComponent = React.memo<StatefulBodyComponentProps>(
  ({
    addNoteToEvent,
    applyDeltaToColumnWidth,
    browserFields,
    columnHeaders,
    data,
    eventIdToNoteIds,
    height,
    id,
    isEventViewer = false,
    isSelectAllChecked,
    loadingEventIds,
    notesById,
    pinEvent,
    pinnedEventIds,
    removeColumn,
    selectedEventIds,
    setSelected,
    clearSelected,
    showCheckboxes,
    showRowRenderers,
    sort,
    toggleColumn,
    unPinEvent,
    updateColumns,
    updateNote,
    updateSort,
  }) => {
    const timelineTypeContext = useTimelineTypeContext();

    const getNotesByIds = useCallback(
      (noteIds: string[]): Note[] => appSelectors.getNotes(notesById, noteIds),
      [notesById]
    );

    const onAddNoteToEvent: AddNoteToEvent = useCallback(
      ({ eventId, noteId }: { eventId: string; noteId: string }) =>
        addNoteToEvent!({ id, eventId, noteId }),
      [id]
    );

    const onRowSelected: OnRowSelected = useCallback(
      ({ eventIds, isSelected }: { eventIds: string[]; isSelected: boolean }) => {
        setSelected!({
          id,
          eventIds: getEventIdToDataMapping(data, eventIds, timelineTypeContext.queryFields ?? []),
          isSelected,
          isSelectAllChecked:
            isSelected && Object.keys(selectedEventIds).length + 1 === data.length,
        });
      },
      [id, data, selectedEventIds, timelineTypeContext.queryFields]
    );

    const onSelectAll: OnSelectAll = useCallback(
      ({ isSelected }: { isSelected: boolean }) =>
        isSelected
          ? setSelected!({
              id,
              eventIds: getEventIdToDataMapping(
                data,
                data.map(event => event._id),
                timelineTypeContext.queryFields ?? []
              ),
              isSelected,
              isSelectAllChecked: isSelected,
            })
          : clearSelected!({ id }),
      [id, data, timelineTypeContext.queryFields]
    );

    const onColumnSorted: OnColumnSorted = useCallback(
      sorted => {
        updateSort!({ id, sort: sorted });
      },
      [id]
    );

    const onColumnRemoved: OnColumnRemoved = useCallback(
      columnId => removeColumn!({ id, columnId }),
      [id]
    );

    const onColumnResized: OnColumnResized = useCallback(
      ({ columnId, delta }) => applyDeltaToColumnWidth!({ id, columnId, delta }),
      [id]
    );

    const onPinEvent: OnPinEvent = useCallback(eventId => pinEvent!({ id, eventId }), [id]);

    const onUnPinEvent: OnUnPinEvent = useCallback(eventId => unPinEvent!({ id, eventId }), [id]);

    const onUpdateNote: UpdateNote = useCallback((note: Note) => updateNote!({ note }), []);

    const onUpdateColumns: OnUpdateColumns = useCallback(
      columns => updateColumns!({ id, columns }),
      [id]
    );

    // Sync to timelineTypeContext.selectAll so parent components can select all events
    useEffect(() => {
      if (timelineTypeContext.selectAll) {
        onSelectAll({ isSelected: true });
      }
    }, [timelineTypeContext.selectAll]); // onSelectAll dependency not necessary

    return (
      <Body
        addNoteToEvent={onAddNoteToEvent}
        browserFields={browserFields}
        columnHeaders={columnHeaders || emptyColumnHeaders}
        columnRenderers={columnRenderers}
        data={data}
        eventIdToNoteIds={eventIdToNoteIds}
        getNotesByIds={getNotesByIds}
        height={height}
        id={id}
        isEventViewer={isEventViewer}
        isSelectAllChecked={isSelectAllChecked}
        loadingEventIds={loadingEventIds}
        onColumnRemoved={onColumnRemoved}
        onColumnResized={onColumnResized}
        onColumnSorted={onColumnSorted}
        onRowSelected={onRowSelected}
        onSelectAll={onSelectAll}
        onFilterChange={noop} // TODO: this is the callback for column filters, which is out scope for this phase of delivery
        onPinEvent={onPinEvent}
        onUnPinEvent={onUnPinEvent}
        onUpdateColumns={onUpdateColumns}
        pinnedEventIds={pinnedEventIds}
        rowRenderers={showRowRenderers ? rowRenderers : [plainRowRenderer]}
        selectedEventIds={selectedEventIds}
        showCheckboxes={showCheckboxes}
        sort={sort}
        toggleColumn={toggleColumn}
        updateNote={onUpdateNote}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.browserFields === nextProps.browserFields &&
      prevProps.columnHeaders === nextProps.columnHeaders &&
      prevProps.data === nextProps.data &&
      prevProps.eventIdToNoteIds === nextProps.eventIdToNoteIds &&
      prevProps.notesById === nextProps.notesById &&
      prevProps.height === nextProps.height &&
      prevProps.id === nextProps.id &&
      prevProps.isEventViewer === nextProps.isEventViewer &&
      prevProps.isSelectAllChecked === nextProps.isSelectAllChecked &&
      prevProps.loadingEventIds === nextProps.loadingEventIds &&
      prevProps.pinnedEventIds === nextProps.pinnedEventIds &&
      prevProps.selectedEventIds === nextProps.selectedEventIds &&
      prevProps.showCheckboxes === nextProps.showCheckboxes &&
      prevProps.showRowRenderers === nextProps.showRowRenderers &&
      prevProps.sort === nextProps.sort
    );
  }
);

StatefulBodyComponent.displayName = 'StatefulBodyComponent';

const makeMapStateToProps = () => {
  const memoizedColumnHeaders: (
    headers: ColumnHeader[],
    browserFields: BrowserFields
  ) => ColumnHeader[] = memoizeOne(getColumnHeaders);

  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getNotesByIds = appSelectors.notesByIdsSelector();
  const mapStateToProps = (state: State, { browserFields, id }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, id) ?? timelineDefaults;
    const {
      columns,
      eventIdToNoteIds,
      isSelectAllChecked,
      loadingEventIds,
      pinnedEventIds,
      selectedEventIds,
      showCheckboxes,
      showRowRenderers,
    } = timeline;

    return {
      columnHeaders: memoizedColumnHeaders(columns, browserFields),
      eventIdToNoteIds,
      isSelectAllChecked,
      loadingEventIds,
      notesById: getNotesByIds(state),
      id,
      pinnedEventIds,
      selectedEventIds,
      showCheckboxes,
      showRowRenderers,
    };
  };
  return mapStateToProps;
};

const connector = connect(makeMapStateToProps, {
  addNoteToEvent: timelineActions.addNoteToEvent,
  applyDeltaToColumnWidth: timelineActions.applyDeltaToColumnWidth,
  clearSelected: timelineActions.clearSelected,
  pinEvent: timelineActions.pinEvent,
  removeColumn: timelineActions.removeColumn,
  removeProvider: timelineActions.removeProvider,
  setSelected: timelineActions.setSelected,
  unPinEvent: timelineActions.unPinEvent,
  updateColumns: timelineActions.updateColumns,
  updateNote: appActions.updateNote,
  updateSort: timelineActions.updateSort,
});

type StatefulBodyReduxProps = ConnectedProps<typeof connector>;

export const StatefulBody = connector(StatefulBodyComponent);
