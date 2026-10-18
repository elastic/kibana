/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiTablePagination,
  useEuiTheme,
  useGeneratedHtmlId,
  useResizeObserver,
} from '@elastic/eui';
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import { useGridKeyboardNavigation } from '@kbn/unified-data-table';
import { ESTIMATED_ROW_HEIGHT, OVERSCAN, PAGE_NAVIGATION_ROWS } from './constants';
import { GridFooterRow } from './grid_footer_row';
import { GridHeaderCell } from './grid_header_cell';
import { GridRow } from './grid_row';
import { getGridStyles } from './styles';
import type { GridColumnModel, TanStackDatatableGridProps } from './types';
import { useColumnWidths } from './use_column_widths';

const estimateSize = () => ESTIMATED_ROW_HEIGHT;

/** Unifies the control columns and the data columns, numbering them like `aria-colindex`. */
const useColumnModels = ({
  columns,
  leadingControlColumns,
  trailingControlColumns,
}: Pick<
  TanStackDatatableGridProps,
  'columns' | 'leadingControlColumns' | 'trailingControlColumns'
>) =>
  useMemo<GridColumnModel[]>(() => {
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
  renderFooterCellValue,
  renderCellPopover,
  onRender,
}: TanStackDatatableGridProps) => {
  const themeContext = useEuiTheme();
  const styles = useMemo(() => getGridStyles(themeContext, gridStyle), [themeContext, gridStyle]);
  const gridId = useGeneratedHtmlId({ prefix: 'lnsTanStackGrid' });
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizerRef = useRef<Virtualizer<HTMLDivElement, Element>>();

  const defaultHeight = rowHeightsOptions?.defaultHeight;
  const isTruncated = !defaultHeight || (defaultHeight !== 'auto' && defaultHeight.lineCount <= 1);
  const contentCss = useMemo(() => {
    if (defaultHeight === 'auto') {
      return styles.contentAuto;
    }
    return defaultHeight && defaultHeight.lineCount > 1
      ? styles.contentLineClamp(defaultHeight.lineCount)
      : styles.contentSingleLine;
  }, [defaultHeight, styles]);

  const columnModels = useColumnModels({ columns, leadingControlColumns, trailingControlColumns });
  const { flexStyles, containerStyle, resizingColumnId, onResizeStart, onResizeBy } =
    useColumnWidths({ columnModels, onColumnResize });

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

  // The virtualizer renders its rows after mount: wait for them, unless there is nothing to render.
  const hasRenderedRows = visibleRowCount === 0 || virtualItems.length > 0;
  useEffect(() => {
    if (!hasRenderedRows || !onRender) {
      return;
    }
    const frame = requestAnimationFrame(onRender);
    return () => cancelAnimationFrame(frame);
  }, [hasRenderedRows, onRender, columns, renderCellValue, visibleRowCount]);

  // Page changes start from the top.
  const pageIndex = pagination?.pageIndex;
  useEffect(() => {
    scrollRef.current?.scrollTo?.({ top: 0 });
  }, [pageIndex]);

  const hasFooter =
    Boolean(renderFooterCellValue) ||
    columnModels.some((model) => Boolean(model.control?.footerCellRender));

  // aria-rowindex of the header, the rows of the data set, and the footer below them.
  const headerAriaRow = 1;
  const firstBodyAriaRow = pageOffset + 2;
  const footerAriaRow = rowCount + 2;

  const isBodyRowRendered = useCallback(
    (row: number) => {
      if (virtualItems.length === 0) {
        return true;
      }
      const index = row - firstBodyAriaRow;
      return index >= virtualItems[0].index && index <= virtualItems[virtualItems.length - 1].index;
    },
    [firstBodyAriaRow, virtualItems]
  );
  const scrollToBodyRow = useCallback(
    (row: number) => virtualizerRef.current?.scrollToIndex(row - firstBodyAriaRow),
    [firstBodyAriaRow]
  );
  const layout = useMemo(
    () => ({
      headerRow: headerAriaRow,
      firstBodyRow: firstBodyAriaRow,
      lastBodyRow: firstBodyAriaRow + visibleRowCount - 1,
      footerRow: hasFooter ? footerAriaRow : undefined,
    }),
    [firstBodyAriaRow, visibleRowCount, hasFooter, footerAriaRow]
  );

  const {
    tabStop,
    onFocus,
    onKeyDown: onGridKeyDown,
  } = useGridKeyboardNavigation({
    gridRef: scrollRef,
    layout,
    colCount: columnModels.length,
    initialPosition: { row: firstBodyAriaRow, col: 1 },
    isBodyRowRendered,
    fallbackBodyRow: firstBodyAriaRow + (virtualItems[0]?.index ?? 0),
    scrollToBodyRow,
    pageSize: PAGE_NAVIGATION_ROWS,
  });
  const getTabStopColIndex = (ariaRow: number) =>
    tabStop.row === ariaRow ? tabStop.col : undefined;

  return (
    <div css={styles.container} style={containerStyle} data-test-subj={dataTestSubj}>
      <div
        ref={scrollRef}
        id={gridId}
        role="grid"
        aria-label={ariaLabel}
        aria-rowcount={rowCount + 1 + (hasFooter ? 1 : 0)}
        aria-colcount={columnModels.length}
        tabIndex={-1}
        onFocus={onFocus}
        onKeyDown={onGridKeyDown}
        css={styles.scroll}
        className="eui-scrollBar"
      >
        <div ref={setStickyElement} css={styles.stickyTop}>
          <div role="row" aria-rowindex={headerAriaRow} css={styles.headerRow}>
            {columnModels.map((model, index) => (
              <GridHeaderCell
                key={model.id}
                model={model}
                flexStyle={flexStyles[index]}
                styles={styles}
                isTabStop={getTabStopColIndex(headerAriaRow) === model.ariaColIndex}
                sortDirection={sorting?.columns.find((sort) => sort.id === model.id)?.direction}
                sorting={sorting}
                isResizing={resizingColumnId === model.id}
                onResizeStart={onResizeStart}
                onResizeBy={onResizeBy}
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
              const ariaRowIndex = firstBodyAriaRow + index;
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
                  isTruncated={isTruncated}
                  renderCellValue={renderCellValue}
                  renderCellPopover={renderCellPopover}
                  tabStopColIndex={getTabStopColIndex(ariaRowIndex)}
                  virtualIndex={index}
                  measureElement={rowVirtualizer.measureElement}
                />
              );
            })}
          </div>
        </div>
        {hasFooter && (
          <GridFooterRow
            models={columnModels}
            flexStyles={flexStyles}
            ariaRowIndex={footerAriaRow}
            rowIndex={rowCount}
            styles={styles}
            renderFooterCellValue={renderFooterCellValue}
            tabStopColIndex={getTabStopColIndex(footerAriaRow)}
          />
        )}
      </div>
      {pagination && (
        <EuiTablePagination
          aria-controls={gridId}
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
