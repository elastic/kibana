/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Resizable } from 're-resizable';
import { DragEffects } from '../../../drag_and_drop/draggable_wrapper';
import { getDraggableFieldId, DRAG_TYPE_FIELD } from '../../../drag_and_drop/helpers';
import { DraggableFieldBadge } from '../../../draggables/field_badge';
import { OnColumnRemoved, OnColumnSorted, OnFilterChange, OnColumnResized } from '../../events';
import { EventsTh, EventsThContent, EventsHeadingHandle } from '../../styles';
import { Sort } from '../sort';

import { Header } from './header';
import { ColumnId } from '../column_id';

export type ColumnHeaderType = 'not-filtered' | 'text-filter';

/** The specification of a column header */
export interface ColumnHeader {
  aggregatable?: boolean;
  category?: string;
  columnHeaderType: ColumnHeaderType;
  description?: string;
  example?: string;
  format?: string;
  id: ColumnId;
  placeholder?: string;
  type?: string;
  width: number;
}

interface ColumneHeaderProps {
  draggableIndex: number;
  header: ColumnHeader;
  onColumnRemoved: OnColumnRemoved;
  onColumnSorted: OnColumnSorted;
  onColumnResized: OnColumnResized;
  onFilterChange?: OnFilterChange;
  sort: Sort;
  timelineId: string;
}

const DraggedContainer = ({
  children,
  onDragging,
}: {
  children: JSX.Element;
  onDragging: Function;
}) => {
  React.useEffect(() => {
    onDragging(true);

    return () => onDragging(false);
  });

  return children;
};

export const ColumnHeader = React.memo<ColumneHeaderProps>(
  ({
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

    return (
      <Resizable
        enable={{ right: true }}
        size={{
          width: isDragging ? 0 : header.width,
          height: 'auto',
        }}
        handleComponent={{
          right: <EventsHeadingHandle />,
        }}
        onResizeStop={(e, direction, ref, delta) => {
          onColumnResized({ columnId: header.id, delta: delta.width });
        }}
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
          {(dragProvided, dragSnapshot) =>
            !dragSnapshot.isDragging ? (
              <EventsTh
                {...dragProvided.draggableProps}
                {...dragProvided.dragHandleProps}
                data-test-subj="draggable-header"
                ref={dragProvided.innerRef}
                position="relative"
                // Passing the styles directly to the component because the width is being calculated and is recommended by Styled Components for performance: https://github.com/styled-components/styled-components/issues/134#issuecomment-312415291
                style={{
                  flexBasis: header.width + 'px',
                  ...dragProvided.draggableProps.style,
                }}
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
            ) : (
              <DraggedContainer onDragging={setIsDragging}>
                <DragEffects>
                  <DraggableFieldBadge fieldId={header.id} fieldWidth={header.width + 'px'} />
                </DragEffects>
              </DraggedContainer>
            )
          }
        </Draggable>
      </Resizable>
    );
  }
);
