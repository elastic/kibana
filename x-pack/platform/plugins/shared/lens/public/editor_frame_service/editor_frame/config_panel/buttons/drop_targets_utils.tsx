/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DragDropIdentifier, DropType } from '@kbn/dom-drag-drop';
import type {
  FramePublicAPI,
  Visualization,
  DragDropOperation,
  VisualizationDimensionGroupConfig,
} from '@kbn/lens-common';
import { isOperation } from '../../../../types_guards';

export interface OnVisDropProps<T> {
  prevState: T;
  target: DragDropOperation;
  source: DragDropIdentifier;
  frame: FramePublicAPI;
  dropType: DropType;
  group?: VisualizationDimensionGroupConfig;
}

export function onDropForVisualization<T, P = unknown, E = unknown>(
  props: OnVisDropProps<T>,
  activeVisualization: Visualization<T, P, E>
) {
  const { prevState, target, frame, source, group, dropType } = props;
  const { layerId, columnId, groupId } = target;

  const previousColumn =
    isOperation(source) && group?.requiresPreviousColumnOnDuplicate ? source.columnId : undefined;
  if (isOperation(source) && dropType === 'reorder') {
    return (
      activeVisualization.reorderDimension?.({
        columnId: source.columnId,
        groupId,
        layerId,
        prevState,
        targetColumnId: target.columnId,
        frame,
      }) ?? prevState
    );
  }

  let newVisState = activeVisualization.setDimension({
    columnId,
    groupId,
    layerId,
    prevState,
    previousColumn,
    frame,
  });

  if (
    isOperation(source) &&
    (dropType === 'move_compatible' ||
      dropType === 'move_incompatible' ||
      dropType === 'combine_incompatible' ||
      dropType === 'combine_compatible' ||
      dropType === 'replace_compatible' ||
      dropType === 'replace_incompatible')
  )
    newVisState = activeVisualization.removeDimension({
      layerId: source.layerId,
      columnId: source.columnId,
      prevState: newVisState,
      frame,
    });

  return newVisState;
}
