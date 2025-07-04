/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiDragDropContext, euiDragDropReorder, EuiDroppable } from '@elastic/eui';

import { BodyRows } from './body_rows';

interface DraggableBodyRowsProps<Item> {
  items: Item[];
  onReorder: (reorderedItems: Item[], items: Item[]) => void;
  renderItem: (item: Item, itemIndex: number) => React.ReactNode;
}

export const DraggableBodyRows = <Item extends object>({
  items,
  onReorder,
  renderItem,
}: DraggableBodyRowsProps<Item>) => {
  return (
    <EuiDragDropContext
      onDragEnd={({ source, destination }) => {
        if (source && destination) {
          const reorderedItems = euiDragDropReorder(items, source.index, destination?.index);
          onReorder(reorderedItems, items);
        }
      }}
    >
      <EuiDroppable droppableId="ReorderingArea" grow={false}>
        <BodyRows items={items} renderItem={renderItem} />
      </EuiDroppable>
    </EuiDragDropContext>
  );
};
