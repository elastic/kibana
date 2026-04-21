/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';

export interface AlertActivityColors {
  active: string;
  recovered: string;
}

export const getAlertActivityColors = (euiTheme: UseEuiTheme['euiTheme']): AlertActivityColors => ({
  active: euiTheme.colors.vis.euiColorVisDanger0,
  recovered: euiTheme.colors.vis.euiColorVis0,
});
