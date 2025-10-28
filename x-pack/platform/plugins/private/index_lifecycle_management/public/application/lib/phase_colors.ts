/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import type { Phases } from '../../../common/types';

export interface PhaseColorMap {
  hot: string;
  warm: string;
  cold: string;
  frozen: string;
  delete: string;
}

export const getPhaseColors = (euiTheme: UseEuiTheme['euiTheme']): PhaseColorMap => ({
  hot: euiTheme.colors.vis.euiColorVis6,
  warm: euiTheme.colors.vis.euiColorVis9,
  cold: euiTheme.colors.vis.euiColorVis2,
  frozen: euiTheme.colors.vis.euiColorVis4,
  delete: euiTheme.colors.borderBaseSubdued,
});

export const getPhaseColor = (
  phase: keyof Phases | 'delete',
  euiTheme: UseEuiTheme['euiTheme']
): string => {
  const phaseColors = getPhaseColors(euiTheme);
  return phaseColors[phase as keyof PhaseColorMap];
};
