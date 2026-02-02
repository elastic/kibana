/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  createContext,
  useContext,
} from 'react';
import { css } from '@emotion/react';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  attachInstruction,
  extractInstruction,
  type Instruction,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/list-item';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { collectDescendantStepIds } from '../state_management/utils';
import type { InteractiveModeContext } from '../state_management/interactive_mode_machine';

interface DraggableStepWrapperProps {
  stepId: string;
  index: number;
  level: number;
  children: ReactNode;
  stepRefs: InteractiveModeContext['stepRefs'];
  isBlocked?: boolean;
  hasChildren?: boolean;
  isDragEnabled?: boolean;
}

// Context to share drag handle ref between wrapper and handle component
const DragHandleContext = createContext<React.RefObject<HTMLSpanElement> | null>(null);

export const useDragHandle = () => {
  return useContext(DragHandleContext);
};

export const DragHandle = () => {
  const { euiTheme } = useEuiTheme();
  const dragHandleRef = useDragHandle();

  // Don't render if dragging is disabled (ref will be null)
  if (!dragHandleRef) {
    return null;
  }

  const grabIconStyles = css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }

    svg {
      fill: ${euiTheme.colors.textDisabled};
    }

    &:hover svg {
      fill: ${euiTheme.colors.textParagraph};
    }
  `;

  return (
    <span
      ref={dragHandleRef}
      css={grabIconStyles}
      className="drag-handle"
      data-test-subj="stepDragHandle"
    >
      <EuiIcon type="grab" size="m" />
    </span>
  );
};

interface LineIndicatorProps {
  position: 'top' | 'bottom';
}

const LineIndicator = ({ position }: LineIndicatorProps) => {
  const { euiTheme } = useEuiTheme();

  const indicatorStyles = css`
    position: absolute;
    left: 0;
    right: 0;
    height: ${euiTheme.size.xxs};
    background-color: ${euiTheme.colors.borderStrongAccentSecondary};
    pointer-events: none;
    border-radius: 1px;
    z-index: 10;
  `;

  const topIndicatorStyles = css`
    ${indicatorStyles}
    top: -${euiTheme.size.xs};
  `;

  const bottomIndicatorStyles = css`
    ${indicatorStyles}
    bottom: -${euiTheme.size.xs};
  `;

  return (
    <div
      css={position === 'top' ? topIndicatorStyles : bottomIndicatorStyles}
      data-test-subj={`dragDropLineIndicator-${position}`}
    />
  );
};

export const DraggableStepWrapper = ({
  stepId,
  index,
  level,
  children,
  stepRefs,
  isBlocked = false,
  hasChildren = false,
  isDragEnabled = true,
}: DraggableStepWrapperProps) => {
  const { euiTheme } = useEuiTheme();
  const ref = useRef<HTMLDivElement | null>(null);
  const dragHandleRef = useRef<HTMLSpanElement | null>(null);
  const [instruction, setInstruction] = useState<Instruction | null>(null);

  useEffect(() => {
    const el = ref.current;
    const dragHandle = dragHandleRef.current;
    if (!el || !isDragEnabled) return;

    const reset = () => {
      setInstruction(null);
    };

    // Get descendant IDs for this step
    const steps = stepRefs.map((stepRef) => stepRef.getSnapshot().context.step);
    const descendantIds = collectDescendantStepIds(steps, stepId);

    const cleanup = combine(
      draggable({
        element: el,
        dragHandle: dragHandle || undefined,
        getInitialData: () => ({
          stepId,
          index,
          level,
          descendantIds: Array.from(descendantIds),
        }),
      }),
      dropTargetForElements({
        element: el,
        getData: ({ input, element }) =>
          attachInstruction(
            { stepId, index, level },
            {
              input,
              element,
              operations: {
                // Allow combining (nesting) if target is a condition block (WHERE)
                // Disable if blocked or if it's a regular action block
                combine: isBlocked ? 'not-available' : 'available',
                'reorder-before': 'available',
                'reorder-after': 'available',
              },
            }
          ),
        canDrop: ({ source }) => {
          const sourceDescendantIds = source.data.descendantIds as string[];
          // Can't drop a step onto itself or its descendants
          return !sourceDescendantIds.includes(stepId) && source.data.stepId !== stepId;
        },
        onDrag: ({ self, location }) => {
          const newInstruction = extractInstruction(self.data);
          const isInnerMost = location.current.dropTargets[0]?.element === self.element;

          if (isInnerMost) {
            setInstruction(newInstruction);
          } else {
            reset();
          }
        },
        onDragLeave: reset,
        onDrop: reset,
      })
    );

    return cleanup;
  }, [stepId, index, level, stepRefs, isBlocked, hasChildren, isDragEnabled]);

  const wrapperStyles = css`
    position: relative;
  `;

  const combineHighlightStyles =
    instruction?.operation === 'combine'
      ? css`
          &::after {
            content: '';
            position: absolute;
            inset: 0;
            border: 2px solid ${euiTheme.colors.borderStrongAccentSecondary};
            border-radius: ${euiTheme.border.radius.medium};
            pointer-events: none;
            z-index: 9;
          }
        `
      : '';

  return (
    <DragHandleContext.Provider value={isDragEnabled ? dragHandleRef : null}>
      <div ref={ref} css={[wrapperStyles, combineHighlightStyles]} data-draggable-step>
        {instruction?.operation === 'reorder-before' && <LineIndicator position="top" />}
        {children}
        {instruction?.operation === 'reorder-after' && <LineIndicator position="bottom" />}
      </div>
    </DragHandleContext.Provider>
  );
};
