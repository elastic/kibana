/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties, PointerEvent } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { COLUMN_WIDTH_VAR_PREFIX, MIN_COLUMN_WIDTH } from './constants';
import type { GridColumnModel, TanStackDatatableGridProps } from './types';

const getWidthVar = (column: GridColumnModel) =>
  `${COLUMN_WIDTH_VAR_PREFIX}-${column.ariaColIndex}`;

/** A width set by dragging, only valid while the `initialWidth` it was based on is unchanged. */
interface WidthOverride {
  width: number;
  initialWidth: number | undefined;
}

const getColumnWidth = (column: GridColumnModel, override?: WidthOverride) =>
  column.fixedWidth ??
  (override && override.initialWidth === column.column?.initialWidth
    ? override.width
    : column.column?.initialWidth);

const getColumnFlexStyle = (column: GridColumnModel, hasFixedWidth: boolean): CSSProperties =>
  hasFixedWidth
    ? { flex: `0 0 var(${getWidthVar(column)})` }
    : { flex: '1 1 0', minInlineSize: MIN_COLUMN_WIDTH };

interface UseColumnWidthsParams {
  columnModels: GridColumnModel[];
  onColumnResize: TanStackDatatableGridProps['onColumnResize'];
}

/**
 * Column widths, which are applied through CSS variables so they can change while a column is dragged
 * without re-rendering the rows. Widths are reported to the owner, which can reset them by changing
 * the `initialWidth` of a column.
 */
export const useColumnWidths = ({ columnModels, onColumnResize }: UseColumnWidthsParams) => {
  const [widthOverrides, setWidthOverrides] = useState<Record<string, WidthOverride>>({});
  const [resizingColumnId, setResizingColumnId] = useState<string>();
  const onColumnResizeRef = useRef(onColumnResize);
  onColumnResizeRef.current = onColumnResize;

  const columnWidths = useMemo(
    () => columnModels.map((model) => getColumnWidth(model, widthOverrides[model.id])),
    [columnModels, widthOverrides]
  );

  // Only whether a column has a fixed width matters for its style, the width itself is a CSS variable.
  // Keeping the styles stable while a column is dragged keeps the memoized rows from re-rendering.
  const fixedWidthKey = columnWidths.map((width) => (width != null ? '1' : '0')).join('');
  const flexStyles = useMemo(
    () =>
      columnModels.map((model, index) => getColumnFlexStyle(model, fixedWidthKey[index] === '1')),
    [columnModels, fixedWidthKey]
  );

  const containerStyle = useMemo(() => {
    const style: Record<string, string> = {
      '--lnsTanStackGridMinWidth': `${columnWidths.reduce<number>(
        (sum, width) => sum + (width ?? MIN_COLUMN_WIDTH),
        0
      )}px`,
    };
    columnModels.forEach((model, index) => {
      const width = columnWidths[index];
      if (width != null) {
        style[getWidthVar(model)] = `${width}px`;
      }
    });
    return style as CSSProperties;
  }, [columnModels, columnWidths]);

  const onResizeStart = useCallback(
    (model: GridColumnModel, event: PointerEvent<HTMLDivElement>) => {
      const header = event.currentTarget.parentElement;
      if (!header || event.button !== 0) {
        return;
      }
      event.preventDefault();
      const handle = event.currentTarget;
      handle.setPointerCapture?.(event.pointerId);
      const startX = event.clientX;
      const startWidth = header.getBoundingClientRect().width;
      const isRtl = getComputedStyle(header).direction === 'rtl';
      const initialWidth = model.column?.initialWidth;
      let width = startWidth;
      let frame: number | undefined;
      setResizingColumnId(model.id);

      const applyWidth = () => {
        frame = undefined;
        setWidthOverrides((prev) => ({ ...prev, [model.id]: { width, initialWidth } }));
      };
      const onMove = (moveEvent: globalThis.PointerEvent) => {
        const delta = (moveEvent.clientX - startX) * (isRtl ? -1 : 1);
        width = Math.max(MIN_COLUMN_WIDTH, Math.round(startWidth + delta));
        // Pointer events can fire many times per frame, apply the width at most once per frame.
        if (frame === undefined) {
          frame = requestAnimationFrame(applyWidth);
        }
      };
      const onEnd = () => {
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onEnd);
        handle.removeEventListener('pointercancel', onEnd);
        if (frame !== undefined) {
          cancelAnimationFrame(frame);
          applyWidth();
        }
        setResizingColumnId(undefined);
        if (width !== startWidth) {
          onColumnResizeRef.current?.({ columnId: model.id, width });
        }
      };
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onEnd);
      handle.addEventListener('pointercancel', onEnd);
    },
    []
  );

  /** Resizes a column by a number of pixels, e.g. with the keyboard. */
  const onResizeBy = useCallback((model: GridColumnModel, header: HTMLElement, delta: number) => {
    const width = Math.max(
      MIN_COLUMN_WIDTH,
      Math.round(header.getBoundingClientRect().width + delta)
    );
    setWidthOverrides((prev) => ({
      ...prev,
      [model.id]: { width, initialWidth: model.column?.initialWidth },
    }));
    onColumnResizeRef.current?.({ columnId: model.id, width });
  }, []);

  return { flexStyles, containerStyle, resizingColumnId, onResizeStart, onResizeBy };
};
