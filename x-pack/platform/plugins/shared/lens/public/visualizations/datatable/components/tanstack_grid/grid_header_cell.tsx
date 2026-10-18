/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties, PointerEvent } from 'react';
import React, { memo, useCallback, useState } from 'react';
import type { EuiDataGridSorting, EuiListGroupItemProps } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GridStyles } from './styles';
import type { GridColumnModel } from './types';

type SortDirection = 'asc' | 'desc';

const getMenuItems = (
  model: GridColumnModel,
  sorting: EuiDataGridSorting | undefined,
  onSort: (direction: SortDirection) => void
): EuiListGroupItemProps[] => {
  const { column } = model;
  const actions = column?.actions;
  if (!column || actions === false) {
    return [];
  }
  const items: EuiListGroupItemProps[] = [];
  const isSortable = Boolean(sorting) && column.isSortable !== false;
  if (isSortable) {
    (['asc', 'desc'] as const).forEach((direction) => {
      const setting = direction === 'asc' ? actions?.showSortAsc : actions?.showSortDesc;
      if (setting === false) {
        return;
      }
      items.push({
        label:
          direction === 'asc'
            ? i18n.translate('xpack.lens.table.tanstackGrid.sortAscending', {
                defaultMessage: 'Sort ascending',
              })
            : i18n.translate('xpack.lens.table.tanstackGrid.sortDescending', {
                defaultMessage: 'Sort descending',
              }),
        iconType: direction === 'asc' ? 'sortUp' : 'sortDown',
        color: 'text',
        'data-test-subj': `dataGridHeaderCellActionSort${direction === 'asc' ? 'Asc' : 'Desc'}`,
        ...(typeof setting === 'object' ? setting : {}),
        onClick: () => onSort(direction),
      });
    });
  }
  return [...items, ...(actions?.additional ?? [])];
};

interface GridHeaderCellProps {
  model: GridColumnModel;
  flexStyle: CSSProperties;
  styles: GridStyles;
  isTabStop: boolean;
  /** Direction the column is sorted by, if any. */
  sortDirection?: SortDirection;
  sorting?: EuiDataGridSorting;
  isResizing: boolean;
  onResizeStart: (model: GridColumnModel, event: PointerEvent<HTMLDivElement>) => void;
}

export const GridHeaderCell = memo(
  ({
    model,
    flexStyle,
    styles,
    isTabStop,
    sortDirection,
    sorting,
    isResizing,
    onResizeStart,
  }: GridHeaderCellProps) => {
    const { id, column, control } = model;
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const closeMenu = useCallback(() => setIsMenuOpen(false), []);

    const onSort = useCallback(
      (direction: SortDirection) => {
        if (!sorting) {
          return;
        }
        // Selecting the active sort again removes it.
        const isActive = sorting.columns.some(
          (sort) => sort.id === id && sort.direction === direction
        );
        sorting.onSort(isActive ? [] : [{ id, direction }]);
      },
      [sorting, id]
    );

    const menuItems = getMenuItems(model, sorting, onSort);
    const columnActionsLabel = i18n.translate('xpack.lens.table.tanstackGrid.columnActions', {
      defaultMessage: 'Column actions for {column}',
      values: { column: column?.displayAsText ?? id },
    });
    const HeaderCellRender = control?.headerCellRender;
    const isResizable = model.kind === 'data' && column?.isResizable !== false;

    return (
      <div
        role="columnheader"
        aria-colindex={model.ariaColIndex}
        aria-sort={
          sortDirection ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined
        }
        tabIndex={isTabStop ? 0 : -1}
        className="kbnLensTanStackGridHeaderCell"
        data-test-subj={`dataGridHeaderCell-${id}`}
        data-gridcell-column-id={id}
        data-gridcell-column-index={model.ariaColIndex - 1}
        css={styles.headerCell}
        style={flexStyle}
        {...control?.headerCellProps}
      >
        <div
          css={styles.headerContent}
          data-test-subj={control ? undefined : 'lnsTanStackGridHeaderContent'}
        >
          {HeaderCellRender ? <HeaderCellRender /> : column?.display ?? column?.displayAsText ?? id}
        </div>
        {(sortDirection || menuItems.length > 0) && (
          <div css={styles.headerActions}>
            {sortDirection && (
              <EuiIcon
                type={sortDirection === 'asc' ? 'sortUp' : 'sortDown'}
                size="s"
                aria-hidden="true"
                data-test-subj={`dataGridHeaderCellSortIcon-${id}`}
              />
            )}
            {menuItems.length > 0 && (
              <EuiPopover
                isOpen={isMenuOpen}
                closePopover={closeMenu}
                display="block"
                anchorPosition="downRight"
                offset={7}
                panelPaddingSize="none"
                aria-label={columnActionsLabel}
                button={
                  <EuiToolTip content={columnActionsLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="ellipsis"
                      iconSize="s"
                      color="text"
                      css={[styles.headerMenuButton, isMenuOpen && styles.headerMenuButtonOpen]}
                      aria-label={columnActionsLabel}
                      aria-haspopup="true"
                      aria-expanded={isMenuOpen}
                      data-test-subj={`dataGridHeaderCellActionButton-${id}`}
                      onClick={() => setIsMenuOpen((open) => !open)}
                    />
                  </EuiToolTip>
                }
              >
                <EuiListGroup data-test-subj={`dataGridHeaderCellActionGroup-${id}`}>
                  {menuItems.map(({ onClick, ...item }, index) => (
                    <EuiListGroupItem
                      key={index}
                      {...item}
                      onClick={(event) => {
                        onClick?.(event);
                        closeMenu();
                      }}
                    />
                  ))}
                </EuiListGroup>
              </EuiPopover>
            )}
          </div>
        )}
        {isResizable && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={i18n.translate('xpack.lens.table.tanstackGrid.resizeColumn', {
              defaultMessage: 'Resize column {column}',
              values: { column: column?.displayAsText ?? id },
            })}
            data-test-subj={`dataGridColumnResizer-${id}`}
            css={[styles.resizeHandle, isResizing && styles.resizeHandleActive]}
            onPointerDown={(event) => onResizeStart(model, event)}
          />
        )}
      </div>
    );
  }
);
