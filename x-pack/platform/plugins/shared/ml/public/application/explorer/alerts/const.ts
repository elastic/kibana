/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
} from '@kbn/rule-data-utils';

export const statusNameMap = {
  [ALERT_STATUS_ACTIVE]: i18n.translate('xpack.ml.explorer.alertsPanel.statusNameMap.active', {
    defaultMessage: 'Active',
  }),
  [ALERT_STATUS_RECOVERED]: i18n.translate(
    'xpack.ml.explorer.alertsPanel.statusNameMap.recovered',
    {
      defaultMessage: 'Recovered',
    }
  ),
  [ALERT_STATUS_UNTRACKED]: i18n.translate(
    'xpack.ml.explorer.alertsPanel.statusNameMap.untracked',
    {
      defaultMessage: 'Untracked',
    }
  ),
} as const;
