/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import type { EuiDataGridColumnCellAction } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopoverFooter,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { CellActionsBubbleAction } from '@kbn/unified-data-table';
import type { TanStackCellPopoverProps } from './types';

export const EXPAND_CELL_TEST_SUBJ = 'euiDataGridCellExpandButton';

/** The icon variant of a cell action, shown in the cell actions bubble. */
export const CellActionIconButton: typeof EuiButtonIcon = ({
  children,
  title,
  'aria-label': ariaLabel,
  ...rest
}) => {
  const label =
    ariaLabel ??
    (typeof children === 'string' ? children : undefined) ??
    (typeof title === 'string' ? title : undefined);
  // An icon-only button without an accessible name is unusable for assistive technology.
  if (!label) {
    return null;
  }
  return (
    <EuiToolTip content={title ?? children ?? label} disableScreenReaderOutput>
      <EuiButtonIcon {...rest} aria-label={label} size="xs" iconSize="s" color="text" />
    </EuiToolTip>
  );
};

/** The labelled variant of a cell action, shown in the footer of the cell popover. */
const CellActionPopoverButton: typeof EuiButtonEmpty = (props) => (
  <EuiButtonEmpty {...props} size="s" />
);

interface CellActionsArgs {
  rowIndex: number;
  colIndex: number;
  columnId: string;
}

export const getBubbleActions = (
  cellActions: EuiDataGridColumnCellAction[],
  { rowIndex, colIndex, columnId }: CellActionsArgs,
  expand: { isExpandable: boolean; onExpand: (anchor: HTMLElement) => void }
): CellActionsBubbleAction[] => {
  const actions: CellActionsBubbleAction[] = cellActions.map((Action, index) => ({
    id: `cell-action-${index}`,
    element: (
      <Action
        rowIndex={rowIndex}
        colIndex={colIndex}
        columnId={columnId}
        Component={CellActionIconButton}
        isExpanded={false}
      />
    ),
  }));
  if (expand.isExpandable) {
    const label = i18n.translate('xpack.lens.table.tanstackGrid.expandCell', {
      defaultMessage: 'Expand cell',
    });
    actions.push({
      id: 'expand',
      element: (
        <EuiToolTip content={label} disableScreenReaderOutput>
          <EuiButtonIcon
            data-test-subj={EXPAND_CELL_TEST_SUBJ}
            iconType="maximize"
            aria-label={label}
            size="xs"
            iconSize="s"
            color="text"
            display="empty"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) =>
              expand.onExpand(event.currentTarget)
            }
          />
        </EuiToolTip>
      ),
    });
  }
  return actions;
};

const popoverContentStyles = css({
  maxInlineSize: 'min(75vw, 600px)',
  maxBlockSize: '50vh',
  overflow: 'auto',
  wordBreak: 'break-word',
});

/** The default popover content: the cell value followed by the cell actions. */
export const DefaultCellPopover = ({ children, cellActions }: TanStackCellPopoverProps) => (
  <>
    <EuiText size="s" css={popoverContentStyles}>
      {children}
    </EuiText>
    {cellActions}
  </>
);

export const renderPopoverFooter = (
  cellActions: EuiDataGridColumnCellAction[],
  { rowIndex, colIndex, columnId }: CellActionsArgs,
  onActionClick: () => void
): ReactNode =>
  cellActions.length > 0 ? (
    // Closes the popover once an enabled action has run, the button handlers run first.
    <EuiPopoverFooter
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest('button:not(:disabled)')) {
          onActionClick();
        }
      }}
    >
      <EuiFlexGroup gutterSize="s" responsive={false} wrap>
        {cellActions.map((Action, index) => (
          <EuiFlexItem key={index} grow={false}>
            <Action
              rowIndex={rowIndex}
              colIndex={colIndex}
              columnId={columnId}
              Component={CellActionPopoverButton}
              isExpanded
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPopoverFooter>
  ) : undefined;
