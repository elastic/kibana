/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DATA_COMPARISON_TYPE = {
  NUMERIC: 'numeric',
  CATEGORICAL: 'categorical',
  UNSUPPORTED: 'unsupported',
} as const;

export const REFERENCE_LABEL = i18n.translate('xpack.dataVisualizer.dataDrift.referenceLabel', {
  defaultMessage: 'Reference',
});

export const COMPARISON_LABEL = i18n.translate('xpack.dataVisualizer.dataDrift.comparisonLabel', {
  defaultMessage: 'Comparison',
});

export const DRIFT_P_VALUE_THRESHOLD = 0.05;
