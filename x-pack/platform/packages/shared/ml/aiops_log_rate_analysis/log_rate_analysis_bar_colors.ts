/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';

/** Highlighting color for charts */
export const useLogRateAnalysisBarColors = () => {
  const { euiTheme } = useEuiTheme();
  return {
    barColor: euiTheme.colors.vis.euiColorVis0,
    barHighlightColor: euiTheme.colors.vis.euiColorVis8,
  };
};
