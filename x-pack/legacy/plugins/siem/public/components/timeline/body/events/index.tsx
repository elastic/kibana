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
import { EventsTbody } from '../../styles';
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
  pinnedEventIds: Readonly<Record<string, boolean>>;
  rowRenderers: RowRenderer[];
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
    onColumnResized,
    onPinEvent,
    onUpdateColumns,
    onUnPinEvent,
    pinnedEventIds,
    rowRenderers,
    toggleColumn,
    updateNote,
  }) => (
    <EventsTbody data-test-subj="events">
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
    </EventsTbody>
  )
);
Events.displayName = 'Events';
