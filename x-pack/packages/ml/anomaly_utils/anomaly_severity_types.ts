/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { type MlSeverityType, ML_ANOMALY_SEVERITY } from './anomaly_severity';

export const ML_ANOMALY_SEVERITY_TYPES: Record<ML_ANOMALY_SEVERITY, MlSeverityType> = {
  critical: {
    id: ML_ANOMALY_SEVERITY.CRITICAL,
    label: i18n.translate('xpack.ml.anomalyUtils.severity.criticalLabel', {
      defaultMessage: 'critical',
    }),
  },
  major: {
    id: ML_ANOMALY_SEVERITY.MAJOR,
    label: i18n.translate('xpack.ml.anomalyUtils.severity.majorLabel', {
      defaultMessage: 'major',
    }),
  },
  minor: {
    id: ML_ANOMALY_SEVERITY.MINOR,
    label: i18n.translate('xpack.ml.anomalyUtils.severity.minorLabel', {
      defaultMessage: 'minor',
    }),
  },
  warning: {
    id: ML_ANOMALY_SEVERITY.WARNING,
    label: i18n.translate('xpack.ml.anomalyUtils.severity.warningLabel', {
      defaultMessage: 'warning',
    }),
  },
  unknown: {
    id: ML_ANOMALY_SEVERITY.UNKNOWN,
    label: i18n.translate('xpack.ml.anomalyUtils.severity.unknownLabel', {
      defaultMessage: 'unknown',
    }),
  },
  low: {
    id: ML_ANOMALY_SEVERITY.LOW,
    label: i18n.translate('xpack.ml.anomalyUtils.severityWithLow.lowLabel', {
      defaultMessage: 'low',
    }),
  },
};
