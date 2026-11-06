/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { EuiResizableButton } from '@elastic/eui';
import { css, type SerializedStyles } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { MAX_CELL_HEIGHT } from '../../common/constants';
import type {
  ChartCellDefinition,
  CustomCellDefinition,
  VegaCellDefinition,
} from '../../common/types';
import { useNotebook } from './notebook_context';

const KEYBOARD_STEP = 20;
const KEYBOARD_LARGE_STEP = 100;

const RESIZE_LABEL = i18n.translate('xpack.notebook.cellResize.handleLabel', {
  defaultMessage: 'Resize cell',
});

interface ResizeHandleOptions {
  /** The height a drag or key press starts from. */
  getHeight: () => number;
  minHeight: number;
  /** Called while dragging with `isFinal: false`, then once more with `isFinal: true` on release. */
  onResize: (height: number, isFinal: boolean) => void;
  onReset: () => void;
  ariaLabel?: string;
  dataTestSubj?: string;
}

/** A horizontal drag handle (pointer, arrow keys, Shift for larger steps, Home to reset). */
export const useResizeHandle = ({
  getHeight,
  minHeight,
  onResize,
  onReset,
  ariaLabel = RESIZE_LABEL,
  dataTestSubj = 'notebookCellResizeHandle',
}: ResizeHandleOptions): React.ReactNode => {
  const drag = useRef<{ startY: number; startHeight: number; lastHeight?: number }>();

  const clamp = (next: number) => Math.min(Math.max(Math.round(next), minHeight), MAX_CELL_HEIGHT);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startY: event.clientY, startHeight: getHeight() };
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    const { startY, startHeight } = drag.current;
    const next = clamp(startHeight + event.clientY - startY);
    drag.current.lastHeight = next;
    onResize(next, false);
  };

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    const lastHeight = drag.current?.lastHeight;
    drag.current = undefined;
    if (lastHeight !== undefined) onResize(lastHeight, true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? KEYBOARD_LARGE_STEP : KEYBOARD_STEP;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      onResize(clamp(getHeight() + step), true);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      onResize(clamp(getHeight() - step), true);
    } else if (event.key === 'Home') {
      event.preventDefault();
      onReset();
    }
  };

  return (
    <EuiResizableButton
      indicator="border"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      data-test-subj={dataTestSubj}
    />
  );
};

interface CellResize {
  bodyCss: SerializedStyles;
  /** Rendered by `CellFrame` in place of the footer divider, so the cell keeps a single border. */
  resizeHandle: React.ReactNode;
}

/** The cell's saved display height, which the user can drag taller but never below `defaultHeight`. */
export const useCellResize = (
  cell: ChartCellDefinition | CustomCellDefinition | VegaCellDefinition,
  defaultHeight: number
): CellResize => {
  const { store } = useNotebook();
  const [dragHeight, setDragHeight] = useState<number>();
  const height = Math.min(
    Math.max(dragHeight ?? cell.height ?? defaultHeight, defaultHeight),
    MAX_CELL_HEIGHT
  );

  const save = (next: number) =>
    store.updateCell(cell.id, (current) =>
      current.type === 'chart' || current.type === 'custom' || current.type === 'vega'
        ? { ...current, height: next === defaultHeight ? undefined : next }
        : current
    );

  const resizeHandle = useResizeHandle({
    getHeight: () => height,
    minHeight: defaultHeight,
    onResize: (next, isFinal) => {
      if (!isFinal) {
        setDragHeight(next);
        return;
      }
      save(next);
      setDragHeight(undefined);
    },
    onReset: () => save(defaultHeight),
  });

  return {
    bodyCss: css`
      height: ${height}px;
      overflow: hidden;
    `,
    resizeHandle,
  };
};
