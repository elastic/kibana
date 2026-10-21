/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataStreamPeriod } from '../../../common/vcu_estimate';

/** Each data stream period's name, and what data it covers. */
export const PERIOD_LABELS: Readonly<
  Record<DataStreamPeriod, { title: string; description: string }>
> = {
  recent: {
    title: i18n.translate('xpack.boost.periods.recentTitle', { defaultMessage: 'Recent' }),
    description: i18n.translate('xpack.boost.periods.recentDescription', {
      defaultMessage: 'The newest data, up to the recent max age.',
    }),
  },
  standard: {
    title: i18n.translate('xpack.boost.periods.standardTitle', { defaultMessage: 'Standard' }),
    description: i18n.translate('xpack.boost.periods.standardDescription', {
      defaultMessage: 'Data past the recent phase, up to the standard max age.',
    }),
  },
  background: {
    title: i18n.translate('xpack.boost.periods.backgroundTitle', { defaultMessage: 'Background' }),
    description: i18n.translate('xpack.boost.periods.backgroundDescription', {
      defaultMessage: 'Data older than the standard max age.',
    }),
  },
};
