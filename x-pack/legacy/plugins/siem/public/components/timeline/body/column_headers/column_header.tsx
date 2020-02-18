/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Resizable, ResizeCallback } from 're-resizable';

import { ColumnHeaderOptions } from '../../../../store/timeline/model';
import { DragEffects } from '../../../drag_and_drop/draggable_wrapper';
import { getDraggableFieldId, DRAG_TYPE_FIELD } from '../../../drag_and_drop/helpers';
import { DraggableFieldBadge } from '../../../draggables/field_badge';
import { OnColumnRemoved, OnColumnSorted, OnFilterChange, OnColumnResized } from '../../events';
import { EventsTh, EventsThContent, EventsHeadingHandle } from '../../styles';
import { Sort } from '../sort';
import { DraggingContainer } from './common/dragging_container';

import { Header } from './header';

interface ColumneHeaderProps {
  draggableIndex: number;
  header: ColumnHeaderOptions;
  onColumnRemoved: OnColumnRemoved;
  onColumnSorted: OnColumnSorted;
  onColumnResized: OnColumnResized;
  onFilterChange?: OnFilterChange;
  sort: Sort;
  timelineId: string;
}

const ColumnHeaderComponent: React.FC<ColumneHeaderProps> = ({
  draggableIndex,
  header,
  timelineId,
  onColumnRemoved,
  onColumnResized,
  onColumnSorted,
  onFilterChange,
  sort,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const handleResizeStop: ResizeCallback = (e, direction, ref, delta) => {
    onColumnResized({ columnId: header.id, delta: delta.width });
  };

  return (
    <Resizable
      enable={{ right: true }}
      size={{
        width: header.width,
        height: 'auto',
      }}
      style={{
        position: isDragging ? 'absolute' : 'relative',
      }}
      handleComponent={{
        right: <EventsHeadingHandle />,
      }}
      onResizeStop={handleResizeStop}
    >
      <Draggable
        data-test-subj="draggable"
        // Required for drag events while hovering the sort button to work: https://github.com/atlassian/react-beautiful-dnd/blob/master/docs/api/draggable.md#interactive-child-elements-within-a-draggable-
        disableInteractiveElementBlocking
        draggableId={getDraggableFieldId({
          contextId: `timeline-column-headers-${timelineId}`,
          fieldId: header.id,
        })}
        index={draggableIndex}
        key={header.id}
        type={DRAG_TYPE_FIELD}
      >
        {(dragProvided, dragSnapshot) => (
          <EventsTh
            data-test-subj="draggable-header"
            {...dragProvided.draggableProps}
            {...dragProvided.dragHandleProps}
            ref={dragProvided.innerRef}
          >
            {!dragSnapshot.isDragging ? (
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
            ) : (
              <DraggingContainer onDragging={setIsDragging}>
                <DragEffects>
                  <DraggableFieldBadge fieldId={header.id} fieldWidth={`${header.width}px`} />
                </DragEffects>
              </DraggingContainer>
            )}
          </EventsTh>
        )}
      </Draggable>
    </Resizable>
  );
};

export const ColumnHeader = React.memo(ColumnHeaderComponent);
