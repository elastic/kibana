/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { euiThemeVars } from '@kbn/ui-theme';
import { DEFAULT_INDEX_COLOR } from '../constants';

export const getFillColor = (incompatible: number | undefined): string => {
  if (incompatible === 0) {
    return euiThemeVars.euiColorSuccess;
  } else if (incompatible != null && incompatible > 0) {
    return euiThemeVars.euiColorDanger;
  } else {
    return DEFAULT_INDEX_COLOR;
  }
};
