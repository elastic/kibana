/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Resizable, ResizeCallback } from 're-resizable';

import { ColumnHeaderOptions } from '../../../../store/timeline/model';
import { getDraggableFieldId } from '../../../drag_and_drop/helpers';
import { OnColumnRemoved, OnColumnSorted, OnFilterChange, OnColumnResized } from '../../events';
import { EventsTh, EventsThContent, EventsHeadingHandle } from '../../styles';
import { Sort } from '../sort';

import { Header } from './header';

interface ColumneHeaderProps {
  draggableIndex: number;
  header: ColumnHeaderOptions;
  onColumnRemoved: OnColumnRemoved;
  onColumnSorted: OnColumnSorted;
  onColumnResized: OnColumnResized;
  isDragging: boolean;
  onFilterChange?: OnFilterChange;
  sort: Sort;
  timelineId: string;
}

const ColumnHeaderComponent: React.FC<ColumneHeaderProps> = ({
  draggableIndex,
  header,
  timelineId,
  isDragging,
  onColumnRemoved,
  onColumnResized,
  onColumnSorted,
  onFilterChange,
  sort,
}) => {
  const resizableEnable = { right: true };
  const resizableSize = {
    width: header.width,
    height: 'auto',
  };
  const resizableStyle: {
    position: 'absolute' | 'relative';
  } = {
    position: isDragging ? 'absolute' : 'relative',
  };
  const resizableHandleComponent = {
    right: <EventsHeadingHandle />,
  };
  const handleResizeStop: ResizeCallback = useCallback(
    (e, direction, ref, delta) => {
      onColumnResized({ columnId: header.id, delta: delta.width });
    },
    [header.id]
  );
  const draggableId = useMemo(
    () =>
      getDraggableFieldId({
        contextId: `timeline-column-headers-${timelineId}`,
        fieldId: header.id,
      }),
    [timelineId, header.id]
  );

  return (
    <Resizable
      enable={resizableEnable}
      size={resizableSize}
      style={resizableStyle}
      handleComponent={resizableHandleComponent}
      onResizeStop={handleResizeStop}
    >
      <Draggable
        data-test-subj="draggable"
        // Required for drag events while hovering the sort button to work: https://github.com/atlassian/react-beautiful-dnd/blob/master/docs/api/draggable.md#interactive-child-elements-within-a-draggable-
        disableInteractiveElementBlocking
        draggableId={draggableId}
        index={draggableIndex}
        key={header.id}
      >
        {dragProvided => (
          <EventsTh
            data-test-subj="draggable-header"
            {...dragProvided.draggableProps}
            {...dragProvided.dragHandleProps}
            ref={dragProvided.innerRef}
          >
            <EventsThContent>
              <Header
                timelineId={timelineId}
                header={header}
                onColumnRemoved={onColumnRemoved}
                onColumnSorted={onColumnSorted}
                onFilterChange={onFilterChange}
                sort={sort}
              />
            </EventsThContent>
          </EventsTh>
        )}
      </Draggable>
    </Resizable>
  );
};

export const ColumnHeader = React.memo(ColumnHeaderComponent);
