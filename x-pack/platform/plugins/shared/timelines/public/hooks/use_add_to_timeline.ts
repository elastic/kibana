/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Position } from 'css-box-model';
import { range } from 'd3-array';
import { interpolate } from 'd3-interpolate';
import { useCallback } from 'react';
import type { DraggableId, FluidDragActions, SensorAPI } from '@hello-pangea/dnd';

import {
  EMPTY_PROVIDERS_GROUP_CLASS_NAME,
  HIGHLIGHTED_DROP_TARGET_CLASS_NAME,
  IS_DRAGGING_CLASS_NAME,
} from '@kbn/securitysolution-t-grid';

let _sensorApiSingleton: SensorAPI;

/**
 * This hook is passed (in an array) to the `sensors` prop of the
 * `@hello-pangea/dnd` `DragDropContext` component. Example:
 *
 * ```
       <DragDropContext onDragEnd={onDragEnd} sensors={[useAddToTimelineSensor]}>
        {children}
      </DragDropContext>*
 * ```
 *
 * As a side effect of registering this hook with the `DragDropContext`,
 * the `SensorAPI` singleton is initialized. This singleton is used
 * by the `useAddToTimeline` hook.
 */
export const useAddToTimelineSensor = (api: SensorAPI) => {
  _sensorApiSingleton = api;
};

/**
 * Returns the position of the specified element
 */
const getPosition = (element: Element): Position => {
  const rect = element.getBoundingClientRect();

  return { x: rect.left, y: rect.top };
};

const hasDraggableLock = () => _sensorApiSingleton != null && _sensorApiSingleton.isLockClaimed();

/**
 * Returns the position of one of the following timeline drop targets
 * (in the following order of preference):
 * 1) The "Drop anything highlighted..." drop target
 * 2) The persistent "empty" data provider group drop target
 * 3) `null`, because none of the above targets exist (an error state)
 */
export const getDropTargetCoordinate = (): Position | null => {
  // The placeholder in the "Drop anything highlighted here to build an OR query":
  const highlighted = document.querySelector(`.${HIGHLIGHTED_DROP_TARGET_CLASS_NAME}`);

  if (highlighted != null) {
    return getPosition(highlighted);
  }

  // If at least one provider has been added to the timeline, the "Drop anything
  // highlighted..." drop target won't be visible, so we need to drop into the
  // empty group instead:
  const emptyGroup = document.querySelector(`.${EMPTY_PROVIDERS_GROUP_CLASS_NAME}`);

  if (emptyGroup != null) {
    emptyGroup.scrollIntoView();
    return getPosition(emptyGroup);
  }

  return null;
};

/**
 * Returns the coordinates of the specified draggable
 */
export const getDraggableCoordinate = (draggableId: DraggableId): Position | null => {
  // The placeholder in the "Drop anything highlighted here to build an OR query":
  const draggable = document.querySelector(`[data-rbd-draggable-id="${draggableId}"]`);

  if (draggable != null) {
    return getPosition(draggable);
  }

  return null;
};

/**
 * Animates a draggable via `requestAnimationFrame`
 */
export const animate = ({
  drag,
  dropWhenComplete = true,
  fieldName,
  values,
}: {
  drag: FluidDragActions;
  dropWhenComplete?: boolean;
  fieldName: string;
  values: Position[];
}) => {
  requestAnimationFrame(() => {
    if (values.length === 0) {
      if (dropWhenComplete) {
        setTimeout(() => drag.drop(), 0); // schedule the drop the next time around
      }

      return;
    }

    drag.move(values[0]);

    animate({
      drag,
      dropWhenComplete,
      fieldName,
      values: values.slice(1),
    });
  });
};

export interface UseAddToTimeline {
  beginDrag: () => FluidDragActions | null;
  cancelDrag: (dragActions: FluidDragActions | null) => void;
  dragToLocation: ({
    dragActions,
    position,
  }: {
    dragActions: FluidDragActions | null;
    position: Position;
  }) => void;
  endDrag: (dragActions: FluidDragActions | null) => void;
  hasDraggableLock: () => boolean;
  startDragToTimeline: () => void;
}

export interface UseAddToTimelineProps {
  draggableId: DraggableId | undefined;
  fieldName: string;
}

/**
 * This hook animates a draggable data provider to the timeline
 */
export const useAddToTimeline = ({
  draggableId,
  fieldName,
}: UseAddToTimelineProps): UseAddToTimeline => {
  const startDragToTimeline = useCallback(() => {
    if (_sensorApiSingleton == null) {
      throw new TypeError(
        'To use this hook, the companion `useAddToTimelineSensor` hook must be registered in the `sensors` prop of the `DragDropContext`.'
      );
    }

    if (draggableId == null) {
      // A request to start the animation should not have been made, because
      // no draggableId was provided
      return;
    }

    // add the dragging class, which will show the flyout data providers (if the flyout button is being displayed):
    document.body.classList.add(IS_DRAGGING_CLASS_NAME);

    // start the animation after the flyout data providers are visible:
    setTimeout(() => {
      const draggableCoordinate = getDraggableCoordinate(draggableId);
      const dropTargetCoordinate = getDropTargetCoordinate();
      const preDrag = _sensorApiSingleton.tryGetLock(draggableId);

      if (draggableCoordinate != null && dropTargetCoordinate != null && preDrag != null) {
        const steps = 10;
        const points = range(steps + 1).map((i) => ({
          x: interpolate(draggableCoordinate.x, dropTargetCoordinate.x)(i * 0.1),
          y: interpolate(draggableCoordinate.y, dropTargetCoordinate.y)(i * 0.1),
        }));

        const drag = preDrag.fluidLift(draggableCoordinate);
        animate({
          drag,
          fieldName,
          values: points,
        });
      } else {
        document.body.classList.remove(IS_DRAGGING_CLASS_NAME); // it was not possible to perform a drag and drop
      }
    }, 0);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_sensorApiSingleton, draggableId]);

  const beginDrag = useCallback(() => {
    if (draggableId == null) {
      // A request to start the drag should not have been made, because no draggableId was provided
      return null;
    }

    const draggableCoordinate = getDraggableCoordinate(draggableId);
    const preDrag = _sensorApiSingleton.tryGetLock(draggableId);

    return draggableCoordinate != null && preDrag != null
      ? preDrag.fluidLift(draggableCoordinate)
      : null;
  }, [draggableId]);

  const dragToLocation = useCallback(
    ({ dragActions, position }: { dragActions: FluidDragActions | null; position: Position }) => {
      if (dragActions == null || draggableId == null) {
        return;
      }

      const draggableCoordinate = getDraggableCoordinate(draggableId);

      if (draggableCoordinate != null) {
        requestAnimationFrame(() => {
          dragActions.move(position);
        });
      }
    },
    [draggableId]
  );

  const endDrag = useCallback((dragActions: FluidDragActions | null) => {
    if (dragActions !== null) {
      dragActions.drop();
    }
  }, []);

  const cancelDrag = useCallback((dragActions: FluidDragActions | null) => {
    if (dragActions !== null) {
      dragActions.cancel();
    }
  }, []);

  return { beginDrag, cancelDrag, dragToLocation, endDrag, hasDraggableLock, startDragToTimeline };
};
