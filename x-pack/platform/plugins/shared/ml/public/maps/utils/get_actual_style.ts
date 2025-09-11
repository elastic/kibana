/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { getCustomColorRampStyleProperty } from './get_custom_color_ramp_style_property';

export const getActualStyle = (euiTheme: EuiThemeComputed) => ({
  type: 'VECTOR',
  properties: {
    fillColor: getCustomColorRampStyleProperty(euiTheme),
    lineColor: getCustomColorRampStyleProperty(euiTheme),
  },
  isTimeAware: false,
});
