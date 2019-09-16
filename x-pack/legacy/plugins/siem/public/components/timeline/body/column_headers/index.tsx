/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import styled, { css } from 'styled-components';

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

ActionsContainer.displayName = 'ActionsContainer';

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
  minWidth: number;
}

const COLUMN_HEADERS_HEIGHT = '39px';

const ColumnHeadersContainer = styled.div<{ minWidth: number }>`
  ${({ theme }) => css`
    background-color: ${theme.eui.euiColorEmptyShade}

    border-bottom: 2px solid ${theme.eui.euiColorLightShade};
    // display: block;
    // height: ${COLUMN_HEADERS_HEIGHT};
    // overflow: hidden;
    min-width: ${({ minWidth }) => `${minWidth}px`};

    position: sticky;
    top: 0;
    z-index: ${theme.eui.euiZLevel1};
  `}
`;

ColumnHeadersContainer.displayName = 'ColumnHeadersContainer';

const ColumnHeadersFlexGroup = styled(EuiFlexGroup)`
  height: ${COLUMN_HEADERS_HEIGHT};
`;

ColumnHeadersFlexGroup.displayName = 'ColumnHeadersFlexGroup';

const EventsSelectContainer = styled(EuiFlexItem)`
  margin-right: 4px;
`;

EventsSelectContainer.displayName = 'EventsSelectContainer';

const HeaderContainer = styled.div<{ isDragging: boolean }>`
  ${({ theme }) => css`
  {
    border-radius: 4px;
    position: relative;

    &::before {
      background-image: linear-gradient(
          135deg,
          ${theme.eui.euiColorMediumShade} 25%,
          transparent 25%
        ),
        linear-gradient(-135deg, ${theme.eui.euiColorMediumShade} 25%, transparent 25%),
        linear-gradient(135deg, transparent 75%, ${theme.eui.euiColorMediumShade} 75%),
        linear-gradient(-135deg, transparent 75%, ${theme.eui.euiColorMediumShade} 75%);
      background-position: 0 0, 1px 0, 1px -1px, 0px 1px;
      background-size: 2px 2px;
      bottom: 2px;
      content: '';
      display: block;
      left: 2px;
      position: absolute;
      top: 2px;
      width: 4px;
    }

    &:hover,
    &:focus {
      transition: background-color 0.7s ease;
      background-color: #000;
      color: #fff;

      &::before {
        background-image: linear-gradient(
            135deg,
            ${theme.eui.euiColorEmptyShade} 25%,
            transparent 25%
          ),
          linear-gradient(-135deg, ${theme.eui.euiColorEmptyShade} 25%, transparent 25%),
          linear-gradient(135deg, transparent 75%, ${theme.eui.euiColorEmptyShade} 75%),
          linear-gradient(-135deg, transparent 75%, ${theme.eui.euiColorEmptyShade} 75%);
      }
    }
  `}
`;

HeaderContainer.displayName = 'HeaderContainer';

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
                    isEventViewer={isEventViewer}
                    onUpdateColumns={onUpdateColumns}
                    timelineId={timelineId}
                    toggleColumn={toggleColumn}
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
                        <HeaderContainer
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          data-test-subj="draggable-header"
                          innerRef={provided.innerRef}
                          isDragging={snapshot.isDragging}
                        >
                          {!snapshot.isDragging ? (
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
                          ) : (
                            <DragEffects>
                              <DraggableFieldBadge fieldId={header.id} />
                            </DragEffects>
                          )}
                        </HeaderContainer>
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

ColumnHeaders.displayName = 'ColumnHeaders';
