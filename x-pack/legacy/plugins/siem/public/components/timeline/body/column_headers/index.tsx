/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { pure } from 'recompose';
import styled from 'styled-components';

import { BrowserFields } from '../../../../containers/source';
import { DragEffects } from '../../../drag_and_drop/draggable_wrapper';
import { DroppableWrapper } from '../../../drag_and_drop/droppable_wrapper';
import {
  droppableTimelineColumnsPrefix,
  getDraggableFieldId,
  DRAG_TYPE_FIELD,
} from '../../../drag_and_drop/helpers';
import { DraggableFieldBadge } from '../../../draggables/field_badge';
import { StatefulFieldsBrowser } from '../../../fields_browser';
import {
  OnColumnRemoved,
  OnColumnResized,
  OnColumnSorted,
  OnFilterChange,
  OnUpdateColumns,
} from '../../events';
import { Sort } from '../sort';

import { ColumnHeader } from './column_header';
import { EventsSelect } from './events_select';
import { Header } from './header';
import { FIELD_BROWSER_HEIGHT, FIELD_BROWSER_WIDTH } from '../../../fields_browser/helpers';
import { isContainerResizing } from '../../../resize_handle/is_resizing';

const ActionsContainer = styled.div<{ actionsColumnWidth: number }>`
  overflow: hidden;
  width: ${({ actionsColumnWidth }) => actionsColumnWidth}px;
`;

interface Props {
  actionsColumnWidth: number;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeader[];
  isLoading: boolean;
  onColumnRemoved: OnColumnRemoved;
  onColumnResized: OnColumnResized;
  onColumnSorted: OnColumnSorted;
  onFilterChange?: OnFilterChange;
  onUpdateColumns: OnUpdateColumns;
  showEventsSelect: boolean;
  sort: Sort;
  timelineId: string;
  minWidth: number;
}

const COLUMN_HEADERS_HEIGHT = '38px';

const ColumnHeadersContainer = styled.div<{
  minWidth: number;
}>`
  display: block;
  height: ${COLUMN_HEADERS_HEIGHT};
  overflow: hidden;
  overflow-x: auto;
  min-width: ${({ minWidth }) => `${minWidth}px`};
  margin-bottom: 2px;
`;

const ColumnHeadersFlexGroup = styled(EuiFlexGroup)`
  height: ${COLUMN_HEADERS_HEIGHT};
`;

const EventsSelectContainer = styled(EuiFlexItem)`
  margin-right: 4px;
`;

/** Renders the timeline header columns */
export const ColumnHeaders = pure<Props>(
  ({
    actionsColumnWidth,
    browserFields,
    columnHeaders,
    isLoading,
    onColumnRemoved,
    onColumnResized,
    onColumnSorted,
    onUpdateColumns,
    onFilterChange = noop,
    showEventsSelect,
    sort,
    timelineId,
    minWidth,
  }) => {
    const { isResizing, setIsResizing } = isContainerResizing();

    return (
      <ColumnHeadersContainer data-test-subj="column-headers" minWidth={minWidth}>
        <ColumnHeadersFlexGroup
          alignItems="center"
          data-test-subj="column-headers-group"
          gutterSize="none"
        >
          <EuiFlexItem data-test-subj="actions-item" grow={false}>
            <ActionsContainer
              actionsColumnWidth={actionsColumnWidth}
              data-test-subj="actions-container"
            >
              <EuiFlexGroup gutterSize="none">
                {showEventsSelect && (
                  <EventsSelectContainer grow={false}>
                    <EventsSelect checkState="unchecked" timelineId={timelineId} />
                  </EventsSelectContainer>
                )}
                <EuiFlexItem grow={true}>
                  <StatefulFieldsBrowser
                    browserFields={browserFields}
                    columnHeaders={columnHeaders}
                    data-test-subj="field-browser"
                    height={FIELD_BROWSER_HEIGHT}
                    isLoading={isLoading}
                    onUpdateColumns={onUpdateColumns}
                    timelineId={timelineId}
                    width={FIELD_BROWSER_WIDTH}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </ActionsContainer>
          </EuiFlexItem>

          <EuiFlexItem data-test-subj="headers-item" grow={false}>
            <DroppableWrapper
              droppableId={`${droppableTimelineColumnsPrefix}${timelineId}`}
              height={COLUMN_HEADERS_HEIGHT}
              isDropDisabled={false}
              type={DRAG_TYPE_FIELD}
            >
              <EuiFlexGroup data-test-subj="headers-group" gutterSize="none">
                {columnHeaders.map((header, i) => (
                  <EuiFlexItem grow={false} key={header.id}>
                    <Draggable
                      data-test-subj="draggable"
                      draggableId={getDraggableFieldId({
                        contextId: `timeline-column-headers-${timelineId}`,
                        fieldId: header.id,
                      })}
                      index={i}
                      type={DRAG_TYPE_FIELD}
                      isDragDisabled={isResizing}
                    >
                      {(provided, snapshot) => (
                        <div
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          ref={provided.innerRef}
                          data-test-subj="draggable-header"
                        >
                          {!snapshot.isDragging ? (
                            <Header
                              timelineId={timelineId}
                              header={header}
                              isLoading={isLoading}
                              onColumnRemoved={onColumnRemoved}
                              onColumnResized={onColumnResized}
                              onColumnSorted={onColumnSorted}
                              onFilterChange={onFilterChange}
                              setIsResizing={setIsResizing}
                              sort={sort}
                            />
                          ) : (
                            <DragEffects>
                              <DraggableFieldBadge fieldId={header.id} />
                            </DragEffects>
                          )}
                        </div>
                      )}
                    </Draggable>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </DroppableWrapper>
          </EuiFlexItem>
        </ColumnHeadersFlexGroup>
      </ColumnHeadersContainer>
    );
  }
);
