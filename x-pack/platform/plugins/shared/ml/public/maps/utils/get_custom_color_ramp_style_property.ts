/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { FIELD_ORIGIN, STYLE_TYPE } from '@kbn/maps-plugin/common';
import { getMlSeverityColorRampValue } from '@kbn/ml-anomaly-utils';

export const getCustomColorRampStyleProperty = (euiTheme: EuiThemeComputed) => ({
  type: STYLE_TYPE.DYNAMIC,
  options: {
    customColorRamp: getMlSeverityColorRampValue(euiTheme),
    field: {
      name: 'record_score',
      origin: FIELD_ORIGIN.SOURCE,
    },
    useCustomColorRamp: true,
  },
});
