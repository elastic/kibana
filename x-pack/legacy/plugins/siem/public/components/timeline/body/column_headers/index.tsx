/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCheckbox } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React from 'react';
import { Droppable } from 'react-beautiful-dnd';

import { BrowserFields } from '../../../../containers/source';
import { DRAG_TYPE_FIELD, droppableTimelineColumnsPrefix } from '../../../drag_and_drop/helpers';
import { StatefulFieldsBrowser } from '../../../fields_browser';
import { FIELD_BROWSER_HEIGHT, FIELD_BROWSER_WIDTH } from '../../../fields_browser/helpers';
import {
  OnColumnRemoved,
  OnColumnResized,
  OnColumnSorted,
  OnFilterChange,
  OnSelectAll,
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
  isSelectAllChecked: boolean;
  onColumnRemoved: OnColumnRemoved;
  onColumnResized: OnColumnResized;
  onColumnSorted: OnColumnSorted;
  onFilterChange?: OnFilterChange;
  onSelectAll: OnSelectAll;
  onUpdateColumns: OnUpdateColumns;
  showEventsSelect: boolean;
  showSelectAllCheckbox: boolean;
  sort: Sort;
  timelineId: string;
  toggleColumn: (column: ColumnHeader) => void;
}

/** Renders the timeline header columns */
export const ColumnHeadersComponent = ({
  actionsColumnWidth,
  browserFields,
  columnHeaders,
  isEventViewer = false,
  isSelectAllChecked,
  onColumnRemoved,
  onColumnResized,
  onColumnSorted,
  onSelectAll,
  onUpdateColumns,
  onFilterChange = noop,
  showEventsSelect,
  showSelectAllCheckbox,
  sort,
  timelineId,
  toggleColumn,
}: Props) => (
  <EventsThead data-test-subj="column-headers">
    <EventsTrHeader>
      <EventsThGroupActions
        actionsColumnWidth={actionsColumnWidth}
        justifyContent={showSelectAllCheckbox ? 'flexStart' : 'space-between'}
        data-test-subj="actions-container"
      >
        {showEventsSelect && (
          <EventsTh>
            <EventsThContent textAlign="center">
              <EventsSelect checkState="unchecked" timelineId={timelineId} />
            </EventsThContent>
          </EventsTh>
        )}
        {showSelectAllCheckbox && (
          <EventsTh>
            <EventsThContent textAlign="center">
              <EuiCheckbox
                data-test-subj="select-all-events"
                id={'select-all-events'}
                checked={isSelectAllChecked}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  onSelectAll({ isSelected: event.currentTarget.checked });
                }}
              />
            </EventsThContent>
          </EventsTh>
        )}
        <EventsTh>
          <EventsThContent textAlign={showSelectAllCheckbox ? 'left' : 'center'}>
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
        {(dropProvided, snapshot) => (
          <>
            <EventsThGroupData
              data-test-subj="headers-group"
              ref={dropProvided.innerRef}
              isDragging={snapshot.isDraggingOver}
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
);

ColumnHeadersComponent.displayName = 'ColumnHeadersComponent';

export const ColumnHeaders = React.memo(ColumnHeadersComponent);

ColumnHeaders.displayName = 'ColumnHeaders';
