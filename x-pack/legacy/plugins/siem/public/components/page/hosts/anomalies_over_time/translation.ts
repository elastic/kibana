/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ANOMALIES_BY_JOB = i18n.translate('xpack.siem.anomaliesOverTime.anomaliesByJobTitle', {
  defaultMessage: 'Anomalies by job',
});

export const SHOWING = i18n.translate('xpack.siem.anomaliesOverTime.showing', {
  defaultMessage: 'Showing',
});

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.anomaliesOverTime.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {anomaly} other {anomalies}}`,
  });
