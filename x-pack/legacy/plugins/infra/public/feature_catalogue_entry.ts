/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FeatureCatalogueCategory } from '../../../../../src/plugins/home/public';

const APP_ID = 'infra';

export const featureCatalogueEntries = {
  metrics: {
    id: 'infraops',
    title: i18n.translate('xpack.infra.registerFeatures.infraOpsTitle', {
      defaultMessage: 'Metrics',
    }),
    description: i18n.translate('xpack.infra.registerFeatures.infraOpsDescription', {
      defaultMessage:
        'Explore infrastructure metrics and logs for common servers, containers, and services.',
    }),
    icon: 'metricsApp',
    path: `/app/${APP_ID}#infrastructure`,
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA,
  },
  logs: {
    id: 'infralogging',
    title: i18n.translate('xpack.infra.registerFeatures.logsTitle', {
      defaultMessage: 'Logs',
    }),
    description: i18n.translate('xpack.infra.registerFeatures.logsDescription', {
      defaultMessage:
        'Stream logs in real time or scroll through historical views in a console-like experience.',
    }),
    icon: 'logsApp',
    path: `/app/${APP_ID}#logs`,
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA,
  },
};
