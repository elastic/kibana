/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import React, { useCallback } from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { BrowserFields } from '../../../containers/source';
import { TimelineItem } from '../../../graphql/types';
import { Note } from '../../../lib/note';
import { appModel, appSelectors, State, timelineSelectors } from '../../../store';
import { AddNoteToEvent, UpdateNote } from '../../notes/helpers';
import {
  OnColumnRemoved,
  OnColumnResized,
  OnColumnSorted,
  OnPinEvent,
  OnUnPinEvent,
  OnUpdateColumns,
} from '../events';

import { ColumnHeader } from './column_headers/column_header';
import { getColumnHeaders } from './helpers';
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

interface ReduxProps {
  columnHeaders: ColumnHeader[];
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  notesById: appModel.NotesById;
  pinnedEventIds: Readonly<Record<string, boolean>>;
  range?: string;
}

interface DispatchProps {
  addNoteToEvent?: ActionCreator<{ id: string; noteId: string; eventId: string }>;
  applyDeltaToColumnWidth?: ActionCreator<{
    id: string;
    columnId: string;
    delta: number;
  }>;
  pinEvent?: ActionCreator<{
    id: string;
    eventId: string;
  }>;
  removeColumn?: ActionCreator<{
    id: string;
    columnId: string;
  }>;
  unPinEvent?: ActionCreator<{
    id: string;
    eventId: string;
  }>;
  updateColumns?: ActionCreator<{
    id: string;
    columns: ColumnHeader[];
  }>;
  updateSort?: ActionCreator<{
    id: string;
    sort: Sort;
  }>;
  updateNote?: ActionCreator<{ note: Note }>;
}

type StatefulBodyComponentProps = OwnProps & ReduxProps & DispatchProps;

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
    notesById,
    pinEvent,
    pinnedEventIds,
    range,
    removeColumn,
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
        onColumnRemoved={onColumnRemoved}
        onColumnResized={onColumnResized}
        onColumnSorted={onColumnSorted}
        onFilterChange={noop} // TODO: this is the callback for column filters, which is out scope for this phase of delivery
        onPinEvent={onPinEvent}
        onUnPinEvent={onUnPinEvent}
        onUpdateColumns={onUpdateColumns}
        pinnedEventIds={pinnedEventIds}
        range={range!}
        rowRenderers={timelineTypeContext.showRowRenderers ? rowRenderers : [plainRowRenderer]}
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
      prevProps.pinnedEventIds === nextProps.pinnedEventIds &&
      prevProps.range === nextProps.range &&
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
    const { columns, eventIdToNoteIds, pinnedEventIds } = timeline;

    return {
      columnHeaders: memoizedColumnHeaders(columns, browserFields),
      eventIdToNoteIds,
      notesById: getNotesByIds(state),
      id,
      pinnedEventIds,
    };
  };
  return mapStateToProps;
};

export const StatefulBody = connect(makeMapStateToProps, {
  addNoteToEvent: timelineActions.addNoteToEvent,
  applyDeltaToColumnWidth: timelineActions.applyDeltaToColumnWidth,
  pinEvent: timelineActions.pinEvent,
  removeColumn: timelineActions.removeColumn,
  removeProvider: timelineActions.removeProvider,
  unPinEvent: timelineActions.unPinEvent,
  updateColumns: timelineActions.updateColumns,
  updateNote: appActions.updateNote,
  updateSort: timelineActions.updateSort,
})(StatefulBodyComponent);
