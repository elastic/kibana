/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckbox, EuiLoadingSpinner, RenderCellValue } from '@elastic/eui';
import React, { ChangeEvent, memo, useCallback } from 'react';
import { SELECT_ROW_ARIA_LABEL } from '../translations';
import { useAlertsTableContext } from '../../contexts/alerts_table_context';
import { BulkActionsVerbs } from '../../../../../types';

export const BulkActionsCell = memo(
  ({
    visibleRowIndex: rowIndex,
  }: {
    /**
     * Defining manually since the {@renderCellValue} type is missing this prop
     * @external https://github.com/elastic/eui/issues/5811
     */
    visibleRowIndex: number;
  }) => {
    const {
      bulkActionsStore: [{ rowSelection }, updateSelectedRows],
    } = useAlertsTableContext();
    const isChecked = rowSelection.has(rowIndex);
    const isLoading = isChecked && rowSelection.get(rowIndex)?.isLoading;
    const onChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
          updateSelectedRows({ action: BulkActionsVerbs.add, rowIndex });
        } else {
          updateSelectedRows({ action: BulkActionsVerbs.delete, rowIndex });
        }
      },
      [rowIndex, updateSelectedRows]
    );
    if (isLoading) {
      return <EuiLoadingSpinner size="m" data-test-subj="row-loader" />;
    }

    // NOTE: id is prefixed here to avoid conflicts with labels in other sections in the app.
    // see https://github.com/elastic/kibana/issues/162837

    return (
      <EuiCheckbox
        id={`bulk-actions-row-cell-${rowIndex}`}
        aria-label={SELECT_ROW_ARIA_LABEL(rowIndex + 1)}
        checked={isChecked}
        onChange={onChange}
        data-test-subj="bulk-actions-row-cell"
      />
    );
  }
) as unknown as RenderCellValue;
