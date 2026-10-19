/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent, RefObject } from 'react';
import React, { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { EuiDataGridSetCellProps } from '@elastic/eui';
import { keys } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  CellActionsBubble,
  CellActionsPopoverFooter,
  CellExpansionPopover,
  cellActionsHostStyles,
  getCellActionBubbleActions,
  useCellExpansion,
} from '@kbn/unified-data-table';
import { getInteractiveElements, setInteractiveContentTabbable } from './cell_interactive_content';
import { DefaultCellPopover } from './default_cell_popover';
import type { GridStyles } from './styles';
import type { GridColumnModel, TanStackCellValueProps, TanStackDatatableGridProps } from './types';

const noop = () => {};

/** Hover and focus state of a cell, which decides when its actions are mounted. */
const useCellActivation = () => {
  const [isActive, setIsActive] = useState(false);
  const onActivate = useCallback(() => setIsActive(true), []);
  const onDeactivate = useCallback(() => setIsActive(false), []);
  return { isActive, onActivate, onDeactivate, setIsActive };
};

/**
 * Keeps interactive cell content out of the tab order unless the cell is in interactive mode, also
 * for content that is rendered later.
 */
const useInteractiveCellContent = (contentRef: RefObject<HTMLElement | null>) => {
  const [isInteractiveMode, setIsInteractiveMode] = useState(false);

  // After every render of the cell, which covers content it renders.
  useLayoutEffect(() => {
    if (contentRef.current) {
      setInteractiveContentTabbable(contentRef.current, isInteractiveMode);
    }
  });

  // Content can also change on its own, e.g. when it loads something.
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return;
    }
    const observer = new MutationObserver(() =>
      setInteractiveContentTabbable(content, isInteractiveMode)
    );
    observer.observe(content, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [contentRef, isInteractiveMode]);

  /** Starts interactive mode and focuses the first interactive element, when there is one. */
  const enterInteractiveMode = useCallback(() => {
    const content = contentRef.current;
    const [first] = content ? getInteractiveElements(content) : [];
    if (!content || !first) {
      return false;
    }
    setInteractiveContentTabbable(content, true);
    setIsInteractiveMode(true);
    first.focus();
    return true;
  }, [contentRef]);

  const exitInteractiveMode = useCallback(() => setIsInteractiveMode(false), []);

  return { isInteractiveMode, enterInteractiveMode, exitInteractiveMode };
};

/** Single line cells are truncated, show their content as a tooltip when it does not fit. */
const showTruncatedContentAsTitle = (event: MouseEvent<HTMLDivElement>) => {
  const content = event.currentTarget;
  content.title = content.scrollWidth > content.clientWidth ? content.textContent ?? '' : '';
};

export interface GridCellProps {
  model: GridColumnModel;
  /** Index of the row in the whole data set, including the pagination offset. */
  rowIndex: number;
  /** Index of the row on the current page. */
  visibleRowIndex: number;
  renderCellValue: TanStackDatatableGridProps['renderCellValue'];
  renderCellPopover?: TanStackDatatableGridProps['renderCellPopover'];
  styles: GridStyles;
  contentCss: GridStyles['contentSingleLine'];
  /** Whether the content is truncated to a single line. */
  isTruncated: boolean;
  flexStyle: CSSProperties;
  isTabStop: boolean;
}

export const GridCell = memo(
  ({
    model,
    rowIndex,
    visibleRowIndex,
    renderCellValue: RenderCellValue,
    renderCellPopover: RenderCellPopover = DefaultCellPopover,
    styles,
    contentCss,
    isTruncated,
    flexStyle,
    isTabStop,
  }: GridCellProps) => {
    const [cellProps, setCellProps] = useState<EuiDataGridSetCellProps>({});
    const cellRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const { isActive, onActivate, onDeactivate, setIsActive } = useCellActivation();
    const { isInteractiveMode, enterInteractiveMode, exitInteractiveMode } =
      useInteractiveCellContent(contentRef);
    const { anchorRect, open: openExpansion, close: closeExpansion } = useCellExpansion(cellRef);
    const { isExpandable: isExpandableByCell, ...htmlProps } = cellProps;
    const { id: columnId, kind, control, column } = model;

    const colIndex = model.dataColIndex ?? model.ariaColIndex - 1;
    const cellActions = column?.cellActions;
    const isExpandable =
      kind === 'data' && column?.isExpandable !== false && isExpandableByCell !== false;
    const hasActions = kind === 'data' && ((cellActions?.length ?? 0) > 0 || isExpandable);
    const isExpanded = anchorRect !== undefined;

    const valueProps: TanStackCellValueProps = {
      rowIndex,
      visibleRowIndex,
      colIndex,
      columnId,
      schema: column?.schema,
      setCellProps,
      isExpandable,
      isExpanded: false,
      isDetails: false,
    };
    const CellRenderer = control ? control.rowCellRender : RenderCellValue;

    const onBlur = useCallback(
      (event: FocusEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsActive(false);
          exitInteractiveMode();
        }
      },
      [setIsActive, exitInteractiveMode]
    );
    // Like EuiDataGrid, Enter or F2 on the focused cell starts interactive mode when it has
    // interactive content, and expands the cell otherwise. Escape ends interactive mode.
    const onKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        const isCellFocused = event.target === event.currentTarget;
        if (isExpanded && event.key === keys.ESCAPE) {
          // The popover moves focus into itself asynchronously, until then the cell has it.
          event.preventDefault();
          event.stopPropagation();
          closeExpansion();
        } else if (isCellFocused && (event.key === keys.ENTER || event.key === keys.F2)) {
          if (enterInteractiveMode()) {
            event.preventDefault();
          } else if (isExpandable) {
            event.preventDefault();
            openExpansion(event.currentTarget);
          }
        } else if (!isCellFocused && isInteractiveMode && event.key === keys.ESCAPE) {
          event.preventDefault();
          event.stopPropagation();
          exitInteractiveMode();
          event.currentTarget.focus();
        }
      },
      [
        isExpandable,
        isExpanded,
        isInteractiveMode,
        enterInteractiveMode,
        exitInteractiveMode,
        openExpansion,
        closeExpansion,
      ]
    );

    const expandLabel = i18n.translate('xpack.lens.table.tanstackGrid.expandCell', {
      defaultMessage: 'Expand cell',
    });
    const bubbleActions = useMemo(
      () =>
        hasActions && (isActive || isExpanded)
          ? getCellActionBubbleActions({
              cellActions: cellActions ?? [],
              cell: { rowIndex, colIndex, columnId },
              expand: isExpandable ? { label: expandLabel, onExpand: openExpansion } : undefined,
            })
          : [],
      [
        hasActions,
        isActive,
        isExpanded,
        cellActions,
        rowIndex,
        colIndex,
        columnId,
        isExpandable,
        expandLabel,
        openExpansion,
      ]
    );

    return (
      <div
        {...htmlProps}
        ref={cellRef}
        role="gridcell"
        aria-colindex={model.ariaColIndex}
        tabIndex={isTabStop ? 0 : -1}
        data-test-subj="dataGridRowCell"
        data-gridcell-column-id={columnId}
        // Same attributes as EuiDataGrid cells, which tests use to find cells.
        data-gridcell-column-index={model.ariaColIndex - 1}
        data-gridcell-visible-row-index={visibleRowIndex}
        onMouseEnter={hasActions ? onActivate : undefined}
        onMouseLeave={hasActions ? onDeactivate : undefined}
        onFocus={hasActions ? onActivate : undefined}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        css={[styles.cell, hasActions && cellActionsHostStyles]}
        style={{ ...flexStyle, ...htmlProps.style }}
      >
        {kind === 'data' ? (
          <div
            ref={contentRef}
            css={contentCss}
            data-test-subj="lnsTanStackGridCellContent"
            onMouseEnter={isTruncated ? showTruncatedContentAsTitle : undefined}
          >
            <CellRenderer {...valueProps} />
          </div>
        ) : (
          <div ref={contentRef} style={{ display: 'contents' }}>
            <CellRenderer {...valueProps} />
          </div>
        )}
        {bubbleActions.length > 0 && (
          <CellActionsBubble
            anchorCellRef={cellRef}
            actions={bubbleActions}
            stayVisible={isExpanded}
          />
        )}
        {anchorRect && (
          <CellExpansionPopover
            anchorRect={anchorRect}
            onClose={closeExpansion}
            aria-label={i18n.translate('xpack.lens.table.tanstackGrid.cellPopoverAriaLabel', {
              defaultMessage: 'Cell details',
            })}
          >
            <RenderCellPopover
              rowIndex={rowIndex}
              colIndex={colIndex}
              columnId={columnId}
              schema={column?.schema}
              cellActions={
                <CellActionsPopoverFooter
                  cellActions={cellActions ?? []}
                  cell={{ rowIndex, colIndex, columnId }}
                  onActionClick={closeExpansion}
                />
              }
            >
              <CellRenderer {...valueProps} isExpanded isDetails setCellProps={noop} />
            </RenderCellPopover>
          </CellExpansionPopover>
        )}
      </div>
    );
  }
);
