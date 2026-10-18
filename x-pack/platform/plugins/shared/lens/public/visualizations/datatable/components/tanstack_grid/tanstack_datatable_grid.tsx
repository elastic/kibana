/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties, FocusEvent, KeyboardEvent } from 'react';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import type { EuiDataGridSetCellProps } from '@elastic/eui';
import { useEuiTheme, useResizeObserver } from '@elastic/eui';
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
import type { GridStyles } from './styles';
import { getGridStyles } from './styles';
import type { GridColumnModel, TanStackCellValueProps, TanStackDatatableGridProps } from './types';

const estimateSize = () => ESTIMATED_ROW_HEIGHT;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getWidthVar = (column: GridColumnModel) =>
  `${COLUMN_WIDTH_VAR_PREFIX}-${column.ariaColIndex}`;

const getColumnWidth = (column: GridColumnModel) =>
  column.fixedWidth ?? column.column?.initialWidth;

const getColumnFlexStyle = (column: GridColumnModel): CSSProperties =>
  getColumnWidth(column) != null
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

  const flexStyles = useMemo(() => columnModels.map(getColumnFlexStyle), [columnModels]);

  // Column widths are applied through CSS variables, so they can change without re-rendering rows.
  const containerStyle = useMemo(() => {
    const widths = columnModels.map(getColumnWidth);
    const style: Record<string, string> = {
      '--lnsTanStackGridMinWidth': `${widths.reduce<number>(
        (sum, width) => sum + (width ?? MIN_COLUMN_WIDTH),
        0
      )}px`,
    };
    columnModels.forEach((model, index) => {
      const width = widths[index];
      if (width != null) {
        style[getWidthVar(model)] = `${width}px`;
      }
    });
    return style as CSSProperties;
  }, [columnModels]);

  const [stickyElement, setStickyElement] = useState<HTMLDivElement | null>(null);
  const { height: stickyHeight } = useResizeObserver(stickyElement, 'height');

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan: OVERSCAN,
    scrollMargin: stickyHeight,
    scrollPaddingStart: stickyHeight,
  });
  virtualizerRef.current = rowVirtualizer;
  const virtualItems = rowVirtualizer.getVirtualItems();

  const colCount = columnModels.length;
  const firstRow = 1;
  const lastRow = rowCount + 1;

  // Roving tabindex: the grid is a single tab stop, arrow keys move between its cells.
  const [tabStop, setTabStop] = useState<GridPosition>({ row: 2, col: 1 });
  const effectiveTabStop = useMemo<GridPosition>(() => {
    let row = clamp(tabStop.row, firstRow, Math.max(lastRow, firstRow));
    // A virtualized row that is not rendered cannot be a tab stop, fall back to the first rendered one.
    if (row > 1 && virtualItems.length > 0) {
      const index = row - 2;
      if (index < virtualItems[0].index || index > virtualItems[virtualItems.length - 1].index) {
        row = virtualItems[0].index + 2;
      }
    }
    return { row, col: clamp(tabStop.col, 1, Math.max(colCount, 1)) };
  }, [tabStop, lastRow, virtualItems, colCount]);

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
      const index = position.row - 2;
      if (index < 0 || index >= rowCount) {
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
    [rowCount]
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
        position && getNextGridPosition(position, event, { firstRow, lastRow, colCount });
      if (nextPosition) {
        event.preventDefault();
        event.stopPropagation();
        focusCell(nextPosition);
      }
    },
    [lastRow, colCount, focusCell]
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
            {columnModels.map((model, index) => {
              const { id, column, control } = model;
              const HeaderCellRender = control?.headerCellRender;
              return (
                <div
                  key={id}
                  role="columnheader"
                  aria-colindex={model.ariaColIndex}
                  tabIndex={
                    effectiveTabStop.row === 1 && effectiveTabStop.col === model.ariaColIndex
                      ? 0
                      : -1
                  }
                  data-test-subj={`dataGridHeaderCell-${id}`}
                  data-gridcell-column-id={id}
                  css={styles.headerCell}
                  style={flexStyles[index]}
                >
                  {HeaderCellRender ? (
                    <HeaderCellRender />
                  ) : (
                    column?.display ?? column?.displayAsText ?? id
                  )}
                </div>
              );
            })}
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
              const ariaRowIndex = index + 2;
              return (
                <GridRow
                  key={key}
                  models={columnModels}
                  flexStyles={flexStyles}
                  rowIndex={index}
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
    </div>
  );
};
