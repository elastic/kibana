/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useEuiTheme } from '@elastic/eui';

export const useDataDriftColors = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => ({
      // Amsterdam: euiTheme.colors.vis.euiColorVis2
      // Borealis:  euiTheme.colors.vis.euiColorVis4
      referenceColor: euiTheme.flags.hasVisColorAdjustment
        ? euiTheme.colors.vis.euiColorVis2
        : euiTheme.colors.vis.euiColorVis4,
      // Amsterdam: euiTheme.colors.vis.euiColorVis1
      // Borealis:  euiTheme.colors.vis.euiColorVis2
      comparisonColor: euiTheme.flags.hasVisColorAdjustment
        ? euiTheme.colors.vis.euiColorVis1
        : euiTheme.colors.vis.euiColorVis2,
      overlapColor: '#490771',
    }),
    [euiTheme]
  );
};
