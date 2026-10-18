/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties, FocusEvent, KeyboardEvent, PointerEvent } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiDataGridSetCellProps } from '@elastic/eui';
import { EuiTablePagination, useEuiTheme, useResizeObserver } from '@elastic/eui';
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import type { GridPosition } from '@kbn/unified-data-table';
import {
  GRID_CELL_SELECTOR,
  GRID_KEYS,
  getGridPosition,
  getNextGridPosition,
} from '@kbn/unified-data-table';
import {
  COLUMN_WIDTH_VAR_PREFIX,
  ESTIMATED_ROW_HEIGHT,
  MIN_COLUMN_WIDTH,
  OVERSCAN,
} from './constants';
import { GridHeaderCell } from './grid_header_cell';
import type { GridStyles } from './styles';
import { getGridStyles } from './styles';
import type { GridColumnModel, TanStackCellValueProps, TanStackDatatableGridProps } from './types';

const estimateSize = () => ESTIMATED_ROW_HEIGHT;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

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

const getColumnFlexStyle = (column: GridColumnModel, width: number | undefined): CSSProperties =>
  width != null
    ? { flex: `0 0 var(${getWidthVar(column)})` }
    : { flex: '1 1 0', minInlineSize: MIN_COLUMN_WIDTH };

interface GridCellProps {
  model: GridColumnModel;
  rowIndex: number;
  visibleRowIndex: number;
  renderCellValue: TanStackDatatableGridProps['renderCellValue'];
  styles: GridStyles;
  contentCss: GridStyles['contentSingleLine'];
  flexStyle: CSSProperties;
  isTabStop: boolean;
}

const GridCell = memo(
  ({
    model,
    rowIndex,
    visibleRowIndex,
    renderCellValue: RenderCellValue,
    styles,
    contentCss,
    flexStyle,
    isTabStop,
  }: GridCellProps) => {
    const [cellProps, setCellProps] = useState<EuiDataGridSetCellProps>({});
    const { isExpandable, ...htmlProps } = cellProps;
    const { id: columnId, kind, control, column } = model;

    const valueProps: TanStackCellValueProps = {
      rowIndex,
      visibleRowIndex,
      colIndex: model.dataColIndex ?? model.ariaColIndex - 1,
      columnId,
      schema: column?.schema,
      setCellProps,
      isExpandable: false,
      isExpanded: false,
      isDetails: false,
    };
    const CellRenderer = control ? control.rowCellRender : RenderCellValue;

    return (
      <div
        {...htmlProps}
        role="gridcell"
        aria-colindex={model.ariaColIndex}
        tabIndex={isTabStop ? 0 : -1}
        data-test-subj="dataGridRowCell"
        data-gridcell-column-id={columnId}
        data-gridcell-visible-row-index={visibleRowIndex}
        css={styles.cell}
        style={{ ...flexStyle, ...htmlProps.style }}
      >
        {kind === 'data' ? (
          <div css={contentCss} data-test-subj="lnsTanStackGridCellContent">
            <CellRenderer {...valueProps} />
          </div>
        ) : (
          <CellRenderer {...valueProps} />
        )}
      </div>
    );
  }
);

interface GridRowProps {
  models: GridColumnModel[];
  flexStyles: CSSProperties[];
  rowIndex: number;
  visibleRowIndex: number;
  ariaRowIndex: number;
  isStriped: boolean;
  styles: GridStyles;
  contentCss: GridStyles['contentSingleLine'];
  renderCellValue: TanStackDatatableGridProps['renderCellValue'];
  /** Column index (1-based) of the grid's tab stop when it is in this row. */
  tabStopColIndex?: number;
  virtualIndex: number;
  measureElement: Virtualizer<HTMLDivElement, Element>['measureElement'];
}

const GridRow = memo(
  ({
    models,
    flexStyles,
    rowIndex,
    visibleRowIndex,
    ariaRowIndex,
    isStriped,
    styles,
    contentCss,
    renderCellValue,
    tabStopColIndex,
    virtualIndex,
    measureElement,
  }: GridRowProps) => (
    <div
      ref={measureElement}
      data-index={virtualIndex}
      role="row"
      aria-rowindex={ariaRowIndex}
      css={[styles.row, isStriped && styles.rowStriped, styles.rowHover]}
    >
      {models.map((model, index) => (
        <GridCell
          key={model.id}
          model={model}
          rowIndex={rowIndex}
          visibleRowIndex={visibleRowIndex}
          renderCellValue={renderCellValue}
          styles={styles}
          contentCss={contentCss}
          flexStyle={flexStyles[index]}
          isTabStop={model.ariaColIndex === tabStopColIndex}
        />
      ))}
    </div>
  )
);

export const TanStackDatatableGrid = ({
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
  columns,
  leadingControlColumns,
  trailingControlColumns,
  rowCount,
  renderCellValue,
  rowHeightsOptions,
  gridStyle,
  sorting,
  pagination,
  onColumnResize,
}: TanStackDatatableGridProps) => {
  const themeContext = useEuiTheme();
  const styles = useMemo(() => getGridStyles(themeContext, gridStyle), [themeContext, gridStyle]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizerRef = useRef<Virtualizer<HTMLDivElement, Element>>();

  const defaultHeight = rowHeightsOptions?.defaultHeight;
  const contentCss = useMemo(() => {
    if (defaultHeight === 'auto') {
      return styles.contentAuto;
    }
    return defaultHeight && typeof defaultHeight === 'object' && defaultHeight.lineCount > 1
      ? styles.contentLineClamp(defaultHeight.lineCount)
      : styles.contentSingleLine;
  }, [defaultHeight, styles]);

  const columnModels = useMemo<GridColumnModel[]>(() => {
    const leading = (leadingControlColumns ?? []).map((control) => ({
      id: control.id,
      kind: 'leading' as const,
      fixedWidth: control.width,
      control,
    }));
    const data = columns.map((column, dataColIndex) => ({
      id: column.id,
      kind: 'data' as const,
      dataColIndex,
      column,
    }));
    const trailing = (trailingControlColumns ?? []).map((control) => ({
      id: control.id,
      kind: 'trailing' as const,
      fixedWidth: control.width,
      control,
    }));
    return [...leading, ...data, ...trailing].map((model, index) => ({
      ...model,
      ariaColIndex: index + 1,
    }));
  }, [columns, leadingControlColumns, trailingControlColumns]);

  const [widthOverrides, setWidthOverrides] = useState<Record<string, WidthOverride>>({});
  const [resizingColumnId, setResizingColumnId] = useState<string>();

  const columnWidths = useMemo(
    () => columnModels.map((model) => getColumnWidth(model, widthOverrides[model.id])),
    [columnModels, widthOverrides]
  );
  const flexStyles = useMemo(
    () => columnModels.map((model, index) => getColumnFlexStyle(model, columnWidths[index])),
    [columnModels, columnWidths]
  );

  // Column widths are applied through CSS variables, so they can change without re-rendering rows.
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

  const onColumnResizeRef = useRef(onColumnResize);
  onColumnResizeRef.current = onColumnResize;

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
      setResizingColumnId(model.id);

      const onMove = (moveEvent: globalThis.PointerEvent) => {
        const delta = (moveEvent.clientX - startX) * (isRtl ? -1 : 1);
        width = Math.max(MIN_COLUMN_WIDTH, Math.round(startWidth + delta));
        setWidthOverrides((prev) => ({ ...prev, [model.id]: { width, initialWidth } }));
      };
      const onEnd = () => {
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onEnd);
        handle.removeEventListener('pointercancel', onEnd);
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

  const [stickyElement, setStickyElement] = useState<HTMLDivElement | null>(null);
  const { height: stickyHeight } = useResizeObserver(stickyElement, 'height');

  const pageOffset = pagination ? pagination.pageIndex * pagination.pageSize : 0;
  const visibleRowCount = pagination
    ? Math.max(0, Math.min(pagination.pageSize, rowCount - pageOffset))
    : rowCount;

  const rowVirtualizer = useVirtualizer({
    count: visibleRowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan: OVERSCAN,
    scrollMargin: stickyHeight,
    scrollPaddingStart: stickyHeight,
  });
  virtualizerRef.current = rowVirtualizer;
  const virtualItems = rowVirtualizer.getVirtualItems();

  // Page changes start from the top.
  const pageIndex = pagination?.pageIndex;
  useEffect(() => {
    scrollRef.current?.scrollTo?.({ top: 0 });
  }, [pageIndex]);

  const colCount = columnModels.length;
  // Keyboard navigation works on rows of the current page: the header, then the visible rows.
  const firstRow = 1;
  const lastRow = visibleRowCount + 1;
  const toPageRow = useCallback((row: number) => (row <= 1 ? row : row - pageOffset), [pageOffset]);
  const fromPageRow = useCallback(
    (row: number) => (row <= 1 ? row : row + pageOffset),
    [pageOffset]
  );

  // Roving tabindex: the grid is a single tab stop, arrow keys move between its cells.
  const [tabStop, setTabStop] = useState<GridPosition>({ row: 2, col: 1 });
  const effectiveTabStop = useMemo<GridPosition>(() => {
    let row = tabStop.row;
    if (row > 1) {
      // A row that is on another page or virtualized out cannot be a tab stop, fall back to the first rendered one.
      const index = row - 2 - pageOffset;
      if (
        virtualItems.length > 0 &&
        (index < virtualItems[0].index || index > virtualItems[virtualItems.length - 1].index)
      ) {
        row = virtualItems[0].index + 2 + pageOffset;
      }
    }
    return { row, col: clamp(tabStop.col, 1, Math.max(colCount, 1)) };
  }, [tabStop, pageOffset, virtualItems, colCount]);

  const focusCell = useCallback(
    (position: GridPosition) => {
      const findCell = () =>
        scrollRef.current?.querySelector<HTMLElement>(
          `[role="row"][aria-rowindex="${position.row}"] [aria-colindex="${position.col}"]`
        );
      const cell = findCell();
      if (cell) {
        cell.focus();
        return;
      }
      // The row is virtualized out, scroll it into view and focus it once it is rendered.
      const index = position.row - 2 - pageOffset;
      if (index < 0 || index >= visibleRowCount) {
        return;
      }
      virtualizerRef.current?.scrollToIndex(index);
      let attempts = 10;
      const focusWhenRendered = () => {
        const renderedCell = findCell();
        if (renderedCell) {
          renderedCell.focus();
        } else if (--attempts > 0) {
          requestAnimationFrame(focusWhenRendered);
        }
      };
      requestAnimationFrame(focusWhenRendered);
    },
    [pageOffset, visibleRowCount]
  );

  const onFocus = useCallback((event: FocusEvent<HTMLDivElement>) => {
    const position = getGridPosition(event.target);
    if (position) {
      setTabStop((prev) =>
        prev.row === position.row && prev.col === position.col ? prev : position
      );
    }
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      // Only while a cell or header itself is focused, not for content inside of it.
      if (!(event.target instanceof Element) || !event.target.matches(GRID_CELL_SELECTOR)) {
        return;
      }
      if (GRID_KEYS.has(event.key)) {
        event.stopPropagation();
      }
      const position = getGridPosition(event.target);
      const nextPosition =
        position &&
        getNextGridPosition({ ...position, row: toPageRow(position.row) }, event, {
          firstRow,
          lastRow,
          colCount,
        });
      if (nextPosition) {
        event.preventDefault();
        event.stopPropagation();
        focusCell({ ...nextPosition, row: fromPageRow(nextPosition.row) });
      }
    },
    [lastRow, colCount, focusCell, toPageRow, fromPageRow]
  );

  return (
    <div css={styles.container} style={containerStyle} data-test-subj={dataTestSubj}>
      <div
        ref={scrollRef}
        role="grid"
        aria-label={ariaLabel}
        aria-rowcount={rowCount + 1}
        aria-colcount={colCount}
        tabIndex={-1}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        css={styles.scroll}
        className="eui-scrollBar"
      >
        <div ref={setStickyElement} css={styles.stickyTop}>
          <div role="row" aria-rowindex={1} css={styles.headerRow}>
            {columnModels.map((model, index) => (
              <GridHeaderCell
                key={model.id}
                model={model}
                flexStyle={flexStyles[index]}
                styles={styles}
                isTabStop={
                  effectiveTabStop.row === 1 && effectiveTabStop.col === model.ariaColIndex
                }
                sortDirection={sorting?.columns.find((sort) => sort.id === model.id)?.direction}
                sorting={sorting}
                isResizing={resizingColumnId === model.id}
                onResizeStart={onResizeStart}
              />
            ))}
          </div>
        </div>
        <div css={styles.virtualOuter} style={{ height: rowVirtualizer.getTotalSize() }}>
          <div
            css={styles.virtualInner}
            style={{
              transform: `translateY(${
                (virtualItems[0]?.start ?? stickyHeight) - rowVirtualizer.options.scrollMargin
              }px)`,
            }}
          >
            {virtualItems.map(({ index, key }) => {
              const ariaRowIndex = pageOffset + index + 2;
              return (
                <GridRow
                  key={key}
                  models={columnModels}
                  flexStyles={flexStyles}
                  rowIndex={pageOffset + index}
                  visibleRowIndex={index}
                  ariaRowIndex={ariaRowIndex}
                  isStriped={Boolean(gridStyle?.stripes) && index % 2 === 1}
                  styles={styles}
                  contentCss={contentCss}
                  renderCellValue={renderCellValue}
                  tabStopColIndex={
                    effectiveTabStop.row === ariaRowIndex ? effectiveTabStop.col : undefined
                  }
                  virtualIndex={index}
                  measureElement={rowVirtualizer.measureElement}
                />
              );
            })}
          </div>
        </div>
      </div>
      {pagination && (
        <EuiTablePagination
          aria-controls={undefined}
          activePage={pagination.pageIndex}
          pageCount={Math.max(1, Math.ceil(rowCount / pagination.pageSize))}
          itemsPerPage={pagination.pageSize}
          itemsPerPageOptions={pagination.pageSizeOptions}
          onChangePage={pagination.onChangePage}
          onChangeItemsPerPage={pagination.onChangeItemsPerPage}
          data-test-subj="lnsTanStackGridPagination"
        />
      )}
    </div>
  );
};
