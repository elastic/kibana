/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../../../containers/source';
import { TimelineItem } from '../../../../graphql/types';
import { Note } from '../../../../lib/note';
import { AddNoteToEvent, UpdateNote } from '../../../notes/helpers';
import { OnColumnResized, OnPinEvent, OnUnPinEvent, OnUpdateColumns } from '../../events';
import { ColumnHeader } from '../column_headers/column_header';

import { StatefulEvent } from './stateful_event';
import { ColumnRenderer } from '../renderers/column_renderer';
import { RowRenderer } from '../renderers/row_renderer';
import { maxDelay } from '../../../../lib/helpers/scheduler';

const EventsContainer = styled.div<{
  minWidth: number;
}>`
  display: block;
  overflow: hidden;
  min-width: ${({ minWidth }) => `${minWidth}px`};
`;

EventsContainer.displayName = 'EventsContainer';

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
  onColumnResized: OnColumnResized;
  onPinEvent: OnPinEvent;
  onUpdateColumns: OnUpdateColumns;
  onUnPinEvent: OnUnPinEvent;
  minWidth: number;
  pinnedEventIds: Readonly<Record<string, boolean>>;
  rowRenderers: RowRenderer[];
  toggleColumn: (column: ColumnHeader) => void;
  updateNote: UpdateNote;
  width: number;
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
    minWidth,
    onColumnResized,
    onPinEvent,
    onUpdateColumns,
    onUnPinEvent,
    pinnedEventIds,
    rowRenderers,
    toggleColumn,
    updateNote,
    width,
  }) => (
    <EventsContainer data-test-subj="events" minWidth={minWidth}>
      <EuiFlexGroup data-test-subj="events-flex-group" direction="column" gutterSize="none">
        {data.map((event, i) => (
          <EuiFlexItem data-test-subj="event-flex-item" key={event._id}>
            <StatefulEvent
              actionsColumnWidth={actionsColumnWidth}
              addNoteToEvent={addNoteToEvent}
              browserFields={browserFields}
              columnHeaders={columnHeaders}
              columnRenderers={columnRenderers}
              event={event}
              eventIdToNoteIds={eventIdToNoteIds}
              getNotesByIds={getNotesByIds}
              onColumnResized={onColumnResized}
              onPinEvent={onPinEvent}
              onUpdateColumns={onUpdateColumns}
              onUnPinEvent={onUnPinEvent}
              pinnedEventIds={pinnedEventIds}
              rowRenderers={rowRenderers}
              timelineId={id}
              toggleColumn={toggleColumn}
              updateNote={updateNote}
              width={width}
              maxDelay={maxDelay(i)}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EventsContainer>
  )
);

Events.displayName = 'Events';
