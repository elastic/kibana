/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { TIME_UNITS as COMMON_TIME_UNITS } from '../../../common/constants/time_units';

interface TimeUnit {
  labelPlural: string;
  labelSingular: string;
}
export const timeUnits: { [key: string]: TimeUnit } = {
  [COMMON_TIME_UNITS.MILLISECOND]: {
    labelPlural: i18n.translate('xpack.watcher.timeUnits.millisecondPluralLabel', {
      defaultMessage: 'milliseconds',
    }),
    labelSingular: i18n.translate('xpack.watcher.timeUnits.millisecondSingularLabel', {
      defaultMessage: 'millisecond',
    }),
  },
  [COMMON_TIME_UNITS.SECOND]: {
    labelPlural: i18n.translate('xpack.watcher.timeUnits.secondPluralLabel', {
      defaultMessage: 'seconds',
    }),
    labelSingular: i18n.translate('xpack.watcher.timeUnits.secondSingularLabel', {
      defaultMessage: 'second',
    }),
  },
  [COMMON_TIME_UNITS.MINUTE]: {
    labelPlural: i18n.translate('xpack.watcher.timeUnits.minutePluralLabel', {
      defaultMessage: 'minutes',
    }),
    labelSingular: i18n.translate('xpack.watcher.timeUnits.minuteSingularLabel', {
      defaultMessage: 'minute',
    }),
  },
  [COMMON_TIME_UNITS.HOUR]: {
    labelPlural: i18n.translate('xpack.watcher.timeUnits.hourPluralLabel', {
      defaultMessage: 'hours',
    }),
    labelSingular: i18n.translate('xpack.watcher.timeUnits.hourSingularLabel', {
      defaultMessage: 'hour',
    }),
  },
  [COMMON_TIME_UNITS.DAY]: {
    labelPlural: i18n.translate('xpack.watcher.timeUnits.dayPluralLabel', {
      defaultMessage: 'days',
    }),
    labelSingular: i18n.translate('xpack.watcher.timeUnits.daySingularLabel', {
      defaultMessage: 'day',
    }),
  },
};
