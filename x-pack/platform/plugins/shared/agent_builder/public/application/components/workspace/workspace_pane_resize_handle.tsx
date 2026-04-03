/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, KeyboardEvent, MouseEvent, TouchEvent } from 'react';
import React, { useCallback, useRef } from 'react';
import { EuiResizableButton } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const MIN_FRACTION = 0.1;
const KEYBOARD_STEP_PX = 20;

interface WorkspacePaneResizeHandleProps {
  /** Index of the pane to the LEFT of this handle */
  leftIndex: number;
  containerRef: React.RefObject<HTMLDivElement>;
  fractions: readonly number[];
  onFractionsChange: (fractions: number[]) => void;
}

const handleStyles = css`
  flex-shrink: 0;
`;

export const WorkspacePaneResizeHandle: FC<WorkspacePaneResizeHandleProps> = ({
  leftIndex,
  containerRef,
  fractions,
  onFractionsChange,
}) => {
  const startXRef = useRef(0);
  const startFractionsRef = useRef<number[]>([]);

  const redistribute = useCallback(
    (deltaFraction: number) => {
      const next = [...startFractionsRef.current];
      const rightIndex = leftIndex + 1;

      next[leftIndex] = Math.max(MIN_FRACTION, next[leftIndex] + deltaFraction);
      next[rightIndex] = Math.max(
        MIN_FRACTION,
        startFractionsRef.current[leftIndex] +
          startFractionsRef.current[rightIndex] -
          next[leftIndex]
      );

      // Clamp both to prevent overflow
      const combined = startFractionsRef.current[leftIndex] + startFractionsRef.current[rightIndex];
      if (next[leftIndex] + next[rightIndex] !== combined) {
        next[leftIndex] = combined - next[rightIndex];
      }

      onFractionsChange(next);
    },
    [leftIndex, onFractionsChange]
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      startXRef.current = e.clientX;
      startFractionsRef.current = [...fractions];

      const containerWidth = containerRef.current?.getBoundingClientRect().width ?? 1;

      const onMouseMove = (moveEvent: globalThis.MouseEvent) => {
        const deltaPx = moveEvent.clientX - startXRef.current;
        redistribute(deltaPx / containerWidth);
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [fractions, containerRef, redistribute]
  );

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      startXRef.current = e.touches[0].clientX;
      startFractionsRef.current = [...fractions];

      const containerWidth = containerRef.current?.getBoundingClientRect().width ?? 1;

      const onTouchMove = (moveEvent: globalThis.TouchEvent) => {
        const deltaPx = moveEvent.touches[0].clientX - startXRef.current;
        redistribute(deltaPx / containerWidth);
      };

      const onTouchEnd = () => {
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
      };

      document.addEventListener('touchmove', onTouchMove);
      document.addEventListener('touchend', onTouchEnd);
    },
    [fractions, containerRef, redistribute]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const containerWidth = containerRef.current?.getBoundingClientRect().width ?? 1;
      startFractionsRef.current = [...fractions];

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        redistribute(-KEYBOARD_STEP_PX / containerWidth);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        redistribute(KEYBOARD_STEP_PX / containerWidth);
      }
    },
    [fractions, containerRef, redistribute]
  );

  return (
    <EuiResizableButton
      css={handleStyles}
      indicator="border"
      isHorizontal
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      aria-label={i18n.translate('xpack.agentBuilder.workspace.resizePaneAriaLabel', {
        defaultMessage: 'Resize panes. Use left and right arrow keys to adjust.',
      })}
    />
  );
};
