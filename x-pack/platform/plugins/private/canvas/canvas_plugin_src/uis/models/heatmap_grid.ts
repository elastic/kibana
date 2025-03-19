/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { getState, getValue } from '../../../public/lib/resolved_arg';
import { ModelStrings } from '../../../i18n';
import { ResolvedColumns } from '../../../public/expression_types/arg';

const { HeatmapGrid: strings } = ModelStrings;

export const heatmapGrid = () => ({
  name: 'heatmap_grid',
  displayName: strings.getDisplayName(),
  args: [
    {
      name: 'strokeWidth',
      displayName: strings.getStrokeWidthDisplayName(),
      help: strings.getStrokeWidthHelp(),
      argType: 'number',
    },
    {
      name: 'strokeColor',
      displayName: strings.getStrokeColorDisplayName(),
      help: strings.getStrokeColorDisplayName(),
      argType: 'color_picker',
    },
    {
      name: 'isCellLabelVisible',
      displayName: strings.getIsCellLabelVisibleDisplayName(),
      help: strings.getIsCellLabelVisibleHelp(),
      argType: 'toggle',
    },
    {
      name: 'isYAxisLabelVisible',
      displayName: strings.getIsYAxisLabelVisibleDisplayName(),
      help: strings.getIsYAxisLabelVisibleHelp(),
      argType: 'toggle',
    },
    {
      name: 'isYAxisTitleVisible',
      displayName: strings.getIsYAxisTitleVisibleDisplayName(),
      help: strings.getIsYAxisTitleVisibleHelp(),
      argType: 'toggle',
    },
    {
      name: 'isXAxisLabelVisible',
      displayName: strings.getIsXAxisLabelVisibleDisplayName(),
      help: strings.getIsXAxisLabelVisibleHelp(),
      argType: 'toggle',
    },
    {
      name: 'isXAxisTitleVisible',
      displayName: strings.getIsXAxisTitleVisibleDisplayName(),
      help: strings.getIsXAxisTitleVisibleHelp(),
      argType: 'toggle',
    },
  ],
  resolve({ context }: any): ResolvedColumns {
    if (getState(context) !== 'ready') {
      return { columns: [] };
    }
    return { columns: get(getValue(context), 'columns', []) };
  },
});
