/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  DragDropContextProps,
  EuiDroppableProps,
  EuiDragDropContext,
  EuiDroppable,
} from '@elastic/eui';

interface SortableListProps {
  onDragItem: DragDropContextProps['onDragEnd'];
  children: EuiDroppableProps['children'];
  subId?: string; // Optional subId for the droppable area
}

export const SortableList = ({ onDragItem, children, subId }: SortableListProps) => {
  if (!subId) {
    return (
      <EuiDragDropContext onDragEnd={onDragItem}>
        <>{children}</>
      </EuiDragDropContext>
    );
  }
  // no context for subId, just return children
  return (
    <>
      {/* <EuiDroppable isCombineEnabled type={subId || 'main-list'} droppableId={subId}> */}
      {children}
      {/* </EuiDroppable> */}
    </>
  );
};
