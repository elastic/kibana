/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import * as React from 'react';
import { Droppable } from 'react-beautiful-dnd';

import { BrowserFields } from '../../../../containers/source';
import { droppableTimelineColumnsPrefix, DRAG_TYPE_FIELD } from '../../../drag_and_drop/helpers';
import { StatefulFieldsBrowser } from '../../../fields_browser';
import { FIELD_BROWSER_HEIGHT, FIELD_BROWSER_WIDTH } from '../../../fields_browser/helpers';
import {
  OnColumnRemoved,
  OnColumnResized,
  OnColumnSorted,
  OnFilterChange,
  OnUpdateColumns,
} from '../../events';
import {
  EventsTh,
  EventsThContent,
  EventsThead,
  EventsThGroupActions,
  EventsThGroupData,
  EventsTrHeader,
} from '../../styles';
import { Sort } from '../sort';
import { ColumnHeader } from './column_header';
import { EventsSelect } from './events_select';

interface Props {
  actionsColumnWidth: number;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeader[];
  isEventViewer?: boolean;
  onColumnRemoved: OnColumnRemoved;
  onColumnResized: OnColumnResized;
  onColumnSorted: OnColumnSorted;
  onFilterChange?: OnFilterChange;
  onUpdateColumns: OnUpdateColumns;
  showEventsSelect: boolean;
  sort: Sort;
  timelineId: string;
  toggleColumn: (column: ColumnHeader) => void;
}

/** Renders the timeline header columns */
export const ColumnHeaders = React.memo<Props>(
  ({
    actionsColumnWidth,
    browserFields,
    columnHeaders,
    isEventViewer = false,
    onColumnRemoved,
    onColumnResized,
    onColumnSorted,
    onUpdateColumns,
    onFilterChange = noop,
    showEventsSelect,
    sort,
    timelineId,
    toggleColumn,
  }) => (
    <EventsThead data-test-subj="column-headers">
      <EventsTrHeader>
        <EventsThGroupActions
          actionsColumnWidth={actionsColumnWidth}
          data-test-subj="actions-container"
        >
          {showEventsSelect && (
            <EventsTh>
              <EventsThContent textAlign="center">
                <EventsSelect checkState="unchecked" timelineId={timelineId} />
              </EventsThContent>
            </EventsTh>
          )}

          <EventsTh>
            <EventsThContent textAlign="center">
              <StatefulFieldsBrowser
                browserFields={browserFields}
                columnHeaders={columnHeaders}
                data-test-subj="field-browser"
                height={FIELD_BROWSER_HEIGHT}
                isEventViewer={isEventViewer}
                onUpdateColumns={onUpdateColumns}
                timelineId={timelineId}
                toggleColumn={toggleColumn}
                width={FIELD_BROWSER_WIDTH}
              />
            </EventsThContent>
          </EventsTh>
        </EventsThGroupActions>

        <Droppable
          direction={'horizontal'}
          droppableId={`${droppableTimelineColumnsPrefix}${timelineId}`}
          isDropDisabled={false}
          type={DRAG_TYPE_FIELD}
        >
          {dropProvided => (
            <>
              <EventsThGroupData
                data-test-subj="headers-group"
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
              >
                {columnHeaders.map((header, draggableIndex) => (
                  <ColumnHeader
                    key={header.id}
                    draggableIndex={draggableIndex}
                    timelineId={timelineId}
                    header={header}
                    onColumnRemoved={onColumnRemoved}
                    onColumnSorted={onColumnSorted}
                    onFilterChange={onFilterChange}
                    onColumnResized={onColumnResized}
                    sort={sort}
                  />
                ))}
              </EventsThGroupData>
              {dropProvided.placeholder}
            </>
          )}
        </Droppable>
      </EventsTrHeader>
    </EventsThead>
  )
);
ColumnHeaders.displayName = 'ColumnHeaders';
