/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { ResolvedColumns } from '../../../public/expression_types/arg';

import { ViewStrings } from '../../../i18n';
import { getState, getValue } from '../../../public/lib/resolved_arg';

const { Heatmap: strings } = ViewStrings;

export const heatmap = () => ({
  name: 'heatmap',
  displayName: strings.getDisplayName(),
  args: [
    {
      name: 'xAccessor',
      displayName: strings.getXAccessorDisplayName(),
      help: strings.getXAccessorHelp(),
      argType: 'vis_dimension',
      default: `{visdimension}`,
    },
    {
      name: 'yAccessor',
      displayName: strings.getYAccessorDisplayName(),
      help: strings.getYAccessorHelp(),
      argType: 'vis_dimension',
      default: `{visdimension}`,
    },
    {
      name: 'valueAccessor',
      displayName: strings.getValueAccessorDisplayName(),
      help: strings.getValueAccessorHelp(),
      argType: 'vis_dimension',
      default: `{visdimension}`,
    },
    {
      name: 'splitRowAccessor',
      displayName: strings.getSplitRowAccessorDisplayName(),
      help: strings.getSplitRowAccessorHelp(),
      argType: 'vis_dimension',
      default: `{visdimension}`,
    },
    {
      name: 'splitColumnAccessor',
      displayName: strings.getSplitColumnAccessorDisplayName(),
      help: strings.getSplitColumnAccessorHelp(),
      argType: 'vis_dimension',
      default: `{visdimension}`,
    },
    {
      name: 'showTooltip',
      displayName: strings.getShowTooltipDisplayName(),
      help: strings.getShowTooltipHelp(),
      argType: 'toggle',
      default: true,
    },
    {
      name: 'highlightInHover',
      displayName: strings.getHighlightInHoverDisplayName(),
      help: strings.getHighlightInHoverHelp(),
      argType: 'toggle',
    },
    {
      name: 'lastRangeIsRightOpen',
      displayName: strings.getLastRangeIsRightOpenDisplayName(),
      help: strings.getLastRangeIsRightOpenHelp(),
      argType: 'toggle',
      default: true,
    },
    {
      name: 'palette',
      argType: 'stops_palette',
    },
    {
      name: 'legend',
      displayName: strings.getLegendDisplayName(),
      help: strings.getLegendHelp(),
      type: 'model',
      argType: 'heatmap_legend',
    },
    {
      name: 'gridConfig',
      displayName: strings.getGridConfigDisplayName(),
      help: strings.getGridConfigHelp(),
      type: 'model',
      argType: 'heatmap_grid',
    },
  ],
  resolve({ context }: any): ResolvedColumns {
    if (getState(context) !== 'ready') {
      return { columns: [] };
    }
    return { columns: get(getValue(context), 'columns', []) };
  },
});
