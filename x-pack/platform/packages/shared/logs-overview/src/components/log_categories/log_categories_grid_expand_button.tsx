/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip, RenderCellValue } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { LogCategory } from '../../types';
import { getCellContext } from './log_categories_grid_cell';

interface CreateLogCategoriesGridExpandButtonProps {
  expandedRowIndex: number | null;
  onOpenFlyout: (category: LogCategory, rowIndex: number) => void;
  onCloseFlyout: () => void;
}

export const createLogCategoriesGridExpandButton =
  ({
    expandedRowIndex,
    onOpenFlyout,
    onCloseFlyout,
  }: CreateLogCategoriesGridExpandButtonProps): RenderCellValue =>
  (props) => {
    const { rowIndex } = props;
    const { logCategories } = getCellContext(props);
    const logCategory = logCategories[rowIndex];
    const isCurrentRowExpanded = expandedRowIndex === rowIndex;
    const onClickHandler = useCallback(() => {
      if (isCurrentRowExpanded) {
        onCloseFlyout();
      } else {
        onOpenFlyout(logCategory, rowIndex);
      }
    }, [isCurrentRowExpanded, logCategory, rowIndex]);

    return (
      <ExpandButton isCurrentRowExpanded={isCurrentRowExpanded} onClickHandler={onClickHandler} />
    );
  };

interface ExpandButtonProps {
  isCurrentRowExpanded: boolean;
  onClickHandler: () => void;
}

const ExpandButton: React.FC<ExpandButtonProps> = ({ isCurrentRowExpanded, onClickHandler }) => {
  return (
    <EuiToolTip content={buttonLabel}>
      <EuiButtonIcon
        size="xs"
        iconSize="s"
        aria-label={buttonLabel}
        data-test-subj="logsOverviewLogCategoriesGridExpandButton"
        onClick={onClickHandler}
        color={isCurrentRowExpanded ? 'primary' : 'text'}
        iconType={isCurrentRowExpanded ? 'minimize' : 'expand'}
        isSelected={isCurrentRowExpanded}
      />
    </EuiToolTip>
  );
};

const buttonLabel = i18n.translate(
  'xpack.observabilityLogsOverview.logCategoriesGrid.controlColumns.toggleFlyout',
  {
    defaultMessage: 'Toggle flyout with details',
  }
);
