/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { BrowserFields } from '../../../../containers/source';
import { TimelineItem } from '../../../../graphql/types';
import { maxDelay } from '../../../../lib/helpers/scheduler';
import { Note } from '../../../../lib/note';
import { AddNoteToEvent, UpdateNote } from '../../../notes/helpers';
import { OnColumnResized, OnPinEvent, OnUnPinEvent, OnUpdateColumns } from '../../events';
import { EventsContainer } from '../../styles';
import { ColumnHeader } from '../column_headers/column_header';
import { ColumnRenderer } from '../renderers/column_renderer';
import { RowRenderer } from '../renderers/row_renderer';
import { StatefulEvent } from './stateful_event';

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
  onColumnResized: OnColumnResized;
  onPinEvent: OnPinEvent;
  onUpdateColumns: OnUpdateColumns;
  onUnPinEvent: OnUnPinEvent;
  minWidth: number;
  pinnedEventIds: Readonly<Record<string, boolean>>;
  rowRenderers: RowRenderer[];
  toggleColumn: (column: ColumnHeader) => void;
  updateNote: UpdateNote;
}

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
    minWidth,
    onColumnResized,
    onPinEvent,
    onUpdateColumns,
    onUnPinEvent,
    pinnedEventIds,
    rowRenderers,
    toggleColumn,
    updateNote,
  }) => (
    <EventsContainer data-test-subj="events" minWidth={minWidth}>
      <div data-test-subj="events-flex-group">
        {data.map((event, i) => (
          <StatefulEvent
            actionsColumnWidth={actionsColumnWidth}
            addNoteToEvent={addNoteToEvent}
            browserFields={browserFields}
            columnHeaders={columnHeaders}
            columnRenderers={columnRenderers}
            event={event}
            eventIdToNoteIds={eventIdToNoteIds}
            getNotesByIds={getNotesByIds}
            isEventViewer={isEventViewer}
            key={event._id}
            maxDelay={maxDelay(i)}
            onColumnResized={onColumnResized}
            onPinEvent={onPinEvent}
            onUnPinEvent={onUnPinEvent}
            onUpdateColumns={onUpdateColumns}
            pinnedEventIds={pinnedEventIds}
            rowRenderers={rowRenderers}
            timelineId={id}
            toggleColumn={toggleColumn}
            updateNote={updateNote}
          />
        ))}
      </div>
    </EventsContainer>
  )
);

Events.displayName = 'Events';
