/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import useLatest from 'react-use/lib/useLatest';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractInstruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/list-item';
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index';

/**
 * Moves an item of a flat list when one of its `DraggableStepWrapper` rows is
 * dropped on another row of the same list. `ids` are the rows' `stepId`s in order.
 */
export const useListReorderMonitor = (
  ids: readonly string[],
  onMove: (from: number, to: number) => void
): void => {
  const latest = useLatest({ ids, onMove });

  useEffect(
    () =>
      monitorForElements({
        canMonitor: ({ source }) => latest.current.ids.some((id) => id === source.data.stepId),
        onDrop: ({ source, location }) => {
          const { ids: currentIds, onMove: move } = latest.current;
          const target = location.current.dropTargets.find(({ data }) =>
            currentIds.some((id) => id === data.stepId)
          );
          const instruction = target ? extractInstruction(target.data) : null;
          if (!target || !instruction || instruction.blocked) {
            return;
          }
          const startIndex = currentIds.findIndex((id) => id === source.data.stepId);
          const indexOfTarget = currentIds.findIndex((id) => id === target.data.stepId);
          if (startIndex < 0 || startIndex === indexOfTarget) {
            return;
          }
          move(
            startIndex,
            getReorderDestinationIndex({
              startIndex,
              indexOfTarget,
              closestEdgeOfTarget: instruction.operation === 'reorder-before' ? 'top' : 'bottom',
              axis: 'vertical',
            })
          );
        },
      }),
    [latest]
  );
};
