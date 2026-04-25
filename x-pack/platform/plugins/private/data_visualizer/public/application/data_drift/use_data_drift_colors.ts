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
      referenceColor: euiTheme.colors.vis.euiColorVis4,
      comparisonColor: euiTheme.colors.vis.euiColorVis2,
      overlapColor: '#490771',
    }),
    [euiTheme]
  );
};
