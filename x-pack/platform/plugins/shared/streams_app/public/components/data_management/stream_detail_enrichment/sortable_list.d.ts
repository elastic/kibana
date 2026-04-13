import React from 'react';
import type { DragDropContextProps, EuiDroppableProps } from '@elastic/eui';
interface SortableListProps {
    onDragItem: DragDropContextProps['onDragEnd'];
    children: EuiDroppableProps['children'];
}
export declare const SortableList: ({ onDragItem, children }: SortableListProps) => React.JSX.Element;
export {};
