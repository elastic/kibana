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
import {
  EventsTh,
  EventsThContent,
  EventsThead,
  EventsThGroupActions,
  EventsThGroupData,
} from '../../styles';
import { Sort } from '../sort';

import { ColumnHeader } from './column_header';
import { EventsSelect } from './events_select';
import { Header } from './header';
import { FIELD_BROWSER_HEIGHT, FIELD_BROWSER_WIDTH } from '../../../fields_browser/helpers';
import { isContainerResizing } from '../../../resize_handle/is_resizing';

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
      <EventsThead data-test-subj="column-headers" minWidth={minWidth}>
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

        <DroppableWrapper
          droppableId={`${droppableTimelineColumnsPrefix}${timelineId}`}
          // height={COLUMN_HEADERS_HEIGHT}
          isDropDisabled={false}
          type={DRAG_TYPE_FIELD}
        >
          <EventsThGroupData data-test-subj="headers-group">
            {columnHeaders.map((header, i) => (
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
                  <>
                    {!snapshot.isDragging ? (
                      <EventsTh
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        data-test-subj="draggable-header"
                        innerRef={provided.innerRef}
                        isDragging={snapshot.isDragging}
                        key={header.id}
                        width={header.width + 'px'}
                      >
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
                      </EventsTh>
                    ) : (
                      <DragEffects>
                        <DraggableFieldBadge fieldId={header.id} />
                      </DragEffects>
                    )}
                  </>
                )}
              </Draggable>
            ))}
          </EventsThGroupData>
        </DroppableWrapper>
      </EventsThead>
    );
  }
);

ColumnHeaders.displayName = 'ColumnHeaders';
