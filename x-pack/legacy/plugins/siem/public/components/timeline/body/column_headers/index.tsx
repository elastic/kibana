/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCheckbox } from '@elastic/eui';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';

import { BrowserFields } from '../../../../containers/source';
import { DragEffects } from '../../../drag_and_drop/draggable_wrapper';
import {
  DRAG_TYPE_FIELD,
  droppableTimelineColumnsPrefix,
  getDraggableFieldId,
} from '../../../drag_and_drop/helpers';
import { DraggableFieldBadge } from '../../../draggables/field_badge';
import { StatefulFieldsBrowser } from '../../../fields_browser';
import { FIELD_BROWSER_HEIGHT, FIELD_BROWSER_WIDTH } from '../../../fields_browser/helpers';
import { useIsContainerResizing } from '../../../resize_handle/is_resizing';
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
import { Header } from './header';

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
}: Props) => {
  const { isResizing, setIsResizing } = useIsContainerResizing();

  return (
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
        </EventsThGroupActions>

        <Droppable
          direction={'horizontal'}
          droppableId={`${droppableTimelineColumnsPrefix}${timelineId}`}
          isDropDisabled={false}
          type={DRAG_TYPE_FIELD}
        >
          {dropProvided => (
            <EventsThGroupData
              data-test-subj="headers-group"
              ref={dropProvided.innerRef}
              {...dropProvided.droppableProps}
            >
              {columnHeaders.map((header, i) => (
                <Draggable
                  data-test-subj="draggable"
                  // Required for drag events while hovering the sort button to work: https://github.com/atlassian/react-beautiful-dnd/blob/master/docs/api/draggable.md#interactive-child-elements-within-a-draggable-
                  disableInteractiveElementBlocking
                  draggableId={getDraggableFieldId({
                    contextId: `timeline-column-headers-${timelineId}`,
                    fieldId: header.id,
                  })}
                  index={i}
                  isDragDisabled={isResizing}
                  key={header.id}
                  type={DRAG_TYPE_FIELD}
                >
                  {(dragProvided, dragSnapshot) => (
                    <EventsTh
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      data-test-subj="draggable-header"
                      ref={dragProvided.innerRef}
                      isDragging={dragSnapshot.isDragging}
                      position="relative"
                      // Passing the styles directly to the component because the width is being calculated and is recommended by Styled Components for performance: https://github.com/styled-components/styled-components/issues/134#issuecomment-312415291
                      style={{
                        flexBasis: header.width + 'px',
                        ...dragProvided.draggableProps.style,
                      }}
                    >
                      {!dragSnapshot.isDragging ? (
                        <EventsThContent>
                          <Header
                            timelineId={timelineId}
                            header={header}
                            onColumnRemoved={onColumnRemoved}
                            onColumnResized={onColumnResized}
                            onColumnSorted={onColumnSorted}
                            onFilterChange={onFilterChange}
                            setIsResizing={setIsResizing}
                            sort={sort}
                          />
                        </EventsThContent>
                      ) : (
                        <DragEffects>
                          <DraggableFieldBadge
                            fieldId={header.id}
                            fieldWidth={header.width + 'px'}
                          />
                        </DragEffects>
                      )}
                    </EventsTh>
                  )}
                </Draggable>
              ))}
            </EventsThGroupData>
          )}
        </Droppable>
      </EventsTrHeader>
    </EventsThead>
  );
};

ColumnHeadersComponent.displayName = 'ColumnHeadersComponent';

export const ColumnHeaders = React.memo(ColumnHeadersComponent);

ColumnHeaders.displayName = 'ColumnHeaders';
