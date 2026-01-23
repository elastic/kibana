/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';

export interface PhaseColorMap {
  hot: string;
  warm: string;
  cold: string;
  frozen: string;
  delete: string;
}

export const usePhaseColors = (): PhaseColorMap => {
  const { euiTheme } = useEuiTheme();

  return {
    hot: euiTheme.colors.severity.risk,
    warm: euiTheme.colors.severity.warning,
    cold: euiTheme.colors.severity.neutral,
    frozen: euiTheme.colors.vis.euiColorVis3,
    delete: euiTheme.colors.backgroundBaseSubdued,
  };
};
