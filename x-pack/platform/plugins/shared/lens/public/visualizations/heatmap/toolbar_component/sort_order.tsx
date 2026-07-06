/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';

import { EuiFormRow, EuiSelect } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { HeatmapSortPredicate } from '@kbn/lens-common/visualizations/heatmap/types';

const SORT_OPTIONS = [
  {
    value: 'none',
    text: i18n.translate('xpack.lens.heatmap.sortOrder.original', {
      defaultMessage: 'Unsorted',
    }),
  },
  {
    value: 'asc',
    text: i18n.translate('xpack.lens.heatmap.sortOrder.ascending', {
      defaultMessage: 'Ascending',
    }),
  },
  {
    value: 'desc',
    text: i18n.translate('xpack.lens.heatmap.sortOrder.descending', {
      defaultMessage: 'Descending',
    }),
  },
];

function isSortPredicate(value: string): value is HeatmapSortPredicate {
  return ['asc', 'desc'].includes(value);
}

export interface AxisSortOrderProps {
  sortPredicate?: HeatmapSortPredicate;
  disabled?: boolean;
  disabledReason?: string;
  dataTestSubj: string;
  onSortingChange: (sortPredicate?: HeatmapSortPredicate) => void;
}

export function AxisSortOrder({
  sortPredicate,
  disabled = false,
  disabledReason,
  dataTestSubj,
  onSortingChange,
}: AxisSortOrderProps) {
  const onChange = useCallback<React.ChangeEventHandler<HTMLSelectElement>>(
    (e) => {
      if (disabled) return;
      const predicate = e.target.value;
      if (isSortPredicate(predicate)) {
        onSortingChange(predicate);
      } else {
        onSortingChange(undefined);
      }
    },
    [disabled, onSortingChange]
  );
  return (
    <EuiFormRow
      display="columnCompressed"
      label={i18n.translate('xpack.lens.heatmap.sortOrder.label', {
        defaultMessage: 'Sort order',
      })}
      helpText={disabled ? disabledReason : undefined}
      fullWidth
    >
      <EuiSelect
        compressed
        data-test-subj={dataTestSubj}
        options={SORT_OPTIONS}
        // 'none' is just a convenience value to indicate that no sort predicate is set,
        // but we are not going to pass it back to onSortingChange as is not a valid predicate, we use undefined instead
        value={disabled || sortPredicate === undefined ? 'none' : sortPredicate}
        onChange={onChange}
        disabled={disabled}
      />
    </EuiFormRow>
  );
}
