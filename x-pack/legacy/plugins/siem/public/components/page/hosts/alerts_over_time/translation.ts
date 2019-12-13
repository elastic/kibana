/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ALERTS_COUNT_FREQUENCY_BY_MODULE = i18n.translate(
  'xpack.siem.alertsOverTime.alertsCountFrequencyByModuleTitle',
  {
    defaultMessage: 'Alerts count by module',
  }
);

export const SHOWING = i18n.translate('xpack.siem.alertsOverTime.showing', {
  defaultMessage: 'Showing',
});

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.alertsOverTime.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {alert} other {alerts}}`,
  });
