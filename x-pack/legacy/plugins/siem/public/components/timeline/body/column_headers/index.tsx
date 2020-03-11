/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCheckbox } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useState, useEffect, useCallback } from 'react';
import { Droppable, DraggableChildrenFn } from 'react-beautiful-dnd';

import { DragEffects } from '../../../drag_and_drop/draggable_wrapper';
import { DraggableFieldBadge } from '../../../draggables/field_badge';
import { BrowserFields } from '../../../../containers/source';
import { ColumnHeaderOptions } from '../../../../store/timeline/model';
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
import { EventsSelect } from './events_select';
import { ColumnHeader } from './column_header';

interface Props {
  actionsColumnWidth: number;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
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
  toggleColumn: (column: ColumnHeaderOptions) => void;
}

interface ConditionalPortalProps {
  children: React.ReactNode;
  registerProvider: () => void;
  unregisterProvider: () => void;
}

export const ConditionalPortal = React.memo<ConditionalPortalProps>(
  ({ children, registerProvider, unregisterProvider }) => {
    useEffect(() => {
      registerProvider();

      return () => unregisterProvider();
    }, [registerProvider, unregisterProvider]);

    return <>{children}</>;
  }
);

ConditionalPortal.displayName = 'ConditionalPortal';

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
  const [draggingIndex, setDraggingIndex] = useState(null);

  const handleSelectAllChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSelectAll({ isSelected: event.currentTarget.checked });
    },
    [onSelectAll]
  );

  const renderClone: DraggableChildrenFn = useCallback(
    (dragProvided, dragSnapshot, rubric) => {
      console.error('close', dragProvided, dragSnapshot, rubric);
      const index = (rubric as any).source.index;
      const header = columnHeaders[index];

      const registerProvider = () => setDraggingIndex(index);
      const unregisterProvider = () => setDraggingIndex(null);

      return (
        <EventsTh
          data-test-subj="draggable-header"
          {...dragProvided.draggableProps}
          {...dragProvided.dragHandleProps}
          ref={dragProvided.innerRef}
        >
          <ConditionalPortal
            registerProvider={registerProvider}
            unregisterProvider={unregisterProvider}
          >
            <DragEffects>
              <DraggableFieldBadge fieldId={header.id} fieldWidth={`${header.width}px`} />
            </DragEffects>
          </ConditionalPortal>
        </EventsTh>
      );
    },
    [columnHeaders, setDraggingIndex]
  );

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
                  onChange={handleSelectAllChange}
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
          renderClone={renderClone}
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
                    isDragging={draggingIndex === draggableIndex}
                    onColumnRemoved={onColumnRemoved}
                    onColumnSorted={onColumnSorted}
                    onFilterChange={onFilterChange}
                    onColumnResized={onColumnResized}
                    sort={sort}
                  />
                ))}
              </EventsThGroupData>
            </>
          )}
        </Droppable>
      </EventsTrHeader>
    </EventsThead>
  );
};

export const ColumnHeaders = React.memo(ColumnHeadersComponent);
