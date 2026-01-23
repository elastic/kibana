/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  IndexMode,
  type TemplateListItem as IndexTemplate,
} from '@kbn/index-management-shared-types';

export const formatDataRetention = (template: IndexTemplate): string | undefined => {
  const { lifecycle } = template;

  if (!lifecycle?.enabled) {
    return undefined;
  }

  if (lifecycle.infiniteDataRetention) {
    return '∞';
  }

  if (lifecycle.value && lifecycle.unit) {
    return `${lifecycle.value}${lifecycle.unit}`;
  }

  return undefined;
};

export const indexModeLabels = {
  [IndexMode.standard]: i18n.translate(
    'xpack.createClassicStreamFlyout.indexModeLabels.standardIndexModeLabel',
    {
      defaultMessage: 'Standard',
    }
  ),
  [IndexMode.logsdb]: i18n.translate(
    'xpack.createClassicStreamFlyout.indexModeLabels.logsdbIndexModeLabel',
    {
      defaultMessage: 'LogsDB',
    }
  ),
  [IndexMode.time_series]: i18n.translate(
    'xpack.createClassicStreamFlyout.indexModeLabels.timeSeriesIndexModeLabel',
    {
      defaultMessage: 'Time series',
    }
  ),
  [IndexMode.lookup]: i18n.translate(
    'xpack.createClassicStreamFlyout.indexModeLabels.lookupIndexModeLabel',
    {
      defaultMessage: 'Lookup',
    }
  ),
};
