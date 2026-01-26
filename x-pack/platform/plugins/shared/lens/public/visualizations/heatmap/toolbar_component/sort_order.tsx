/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';

import { EuiFormRow, EuiSelect } from '@elastic/eui';

import type { VisualizationToolbarProps } from '@kbn/lens-common';
import { i18n } from '@kbn/i18n';
import type { HeatmapSortPredicate } from '@kbn/expression-heatmap-plugin/common/types';
import type { HeatmapVisualizationState } from '../types';

const sortOptions = [
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

const properties = {
  x: {
    dataTestSubj: 'lnsHeatmapXAxisSortOrder',
    stateProp: 'xSortPredicate' as const,
  },
  y: {
    dataTestSubj: 'lnsHeatmapYAxisSortOrder',
    stateProp: 'ySortPredicate' as const,
  },
};

function isSortPredicate(value: string): value is HeatmapSortPredicate {
  return ['asc', 'desc', 'none'].includes(value);
}

export function AxisSortOrder({
  setState,
  state,
  axis,
}: Pick<VisualizationToolbarProps<HeatmapVisualizationState>, 'state' | 'setState'> & {
  axis: 'x' | 'y';
}) {
  const onChange = useCallback<React.ChangeEventHandler<HTMLSelectElement>>(
    (e) => {
      const predicate = e.target.value;
      if (isSortPredicate(predicate)) {
        setState({
          ...state,
          gridConfig: {
            ...state.gridConfig,
            [properties[axis].stateProp]: predicate,
          },
        });
      }
    },
    [state, setState, axis]
  );
  return (
    <EuiFormRow
      display="columnCompressed"
      label={i18n.translate('xpack.lens.heatmap.sortOrder.label', {
        defaultMessage: 'Sort order',
      })}
      fullWidth
    >
      <EuiSelect
        compressed
        data-test-subj={properties[axis].dataTestSubj}
        options={sortOptions}
        value={state.gridConfig[properties[axis].stateProp] ?? 'none'}
        onChange={onChange}
      />
    </EuiFormRow>
  );
}
