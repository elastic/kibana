/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ast } from '@kbn/interpreter';
import type { UnifiedAxisExtentConfig } from './types';

// TODO: import it from the expression config directly?
const CHART_TO_FN_NAME = {
  xy: 'axisExtentConfig',
} as const;

export const axisExtentConfigToExpression = (
  extent: UnifiedAxisExtentConfig | undefined,
  chartType: keyof typeof CHART_TO_FN_NAME = 'xy'
): Ast => ({
  type: 'expression',
  chain: [
    {
      type: 'function',
      function: CHART_TO_FN_NAME[chartType],
      arguments: {
        // rely on expression default value here
        mode: extent?.mode ? [extent.mode] : [],
        lowerBound: extent?.lowerBound != null ? [extent.lowerBound] : [],
        upperBound: extent?.upperBound != null ? [extent.upperBound] : [],
        // be explicit in this case
        niceValues: extent?.niceValues != null ? [extent.niceValues] : [true],
      },
    },
  ],
});
