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

export const NUMERIC_TYPE_LABEL = i18n.translate('xpack.dataVisualizer.dataDrift.numericLabel', {
  defaultMessage: 'Numeric',
});
export const CATEGORICAL_TYPE_LABEL = i18n.translate(
  'xpack.dataVisualizer.dataDrift.categoricalLabel',
  {
    defaultMessage: 'Categorical',
  }
);

export const UNSUPPORTED_LABEL = i18n.translate('xpack.dataVisualizer.dataDrift.UnsupportedLabel', {
  defaultMessage: 'Unsupported',
});

export const REFERENCE_LABEL = i18n.translate('xpack.dataVisualizer.dataDrift.referenceLabel', {
  defaultMessage: 'Reference',
});

export const COMPARISON_LABEL = i18n.translate('xpack.dataVisualizer.dataDrift.comparisonLabel', {
  defaultMessage: 'Comparison',
});

export const DATA_COMPARISON_TYPE_LABEL = {
  [DATA_COMPARISON_TYPE.NUMERIC]: NUMERIC_TYPE_LABEL,
  [DATA_COMPARISON_TYPE.CATEGORICAL]: CATEGORICAL_TYPE_LABEL,
  [DATA_COMPARISON_TYPE.UNSUPPORTED]: UNSUPPORTED_LABEL,
} as const;

export const DRIFT_P_VALUE_THRESHOLD = 0.05;
