/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nServiceType } from '@kbn/i18n/angular';
import {
  FeatureCatalogueCategory,
  FeatureCatalogueRegistryProvider,
} from 'ui/registry/feature_catalogue';

const APP_ID = 'infra';

FeatureCatalogueRegistryProvider.register((i18n: I18nServiceType) => ({
  id: 'infraops',
  title: i18n('xpack.infra.registerFeatures.infraOpsTitle', {
    defaultMessage: 'Metrics',
  }),
  description: i18n('xpack.infra.registerFeatures.infraOpsDescription', {
    defaultMessage:
      'Explore infrastructure metrics and logs for common servers, containers, and services.',
  }),
  icon: 'metricsApp',
  path: `/app/${APP_ID}#infrastructure`,
  showOnHomePage: true,
  category: FeatureCatalogueCategory.DATA,
}));

FeatureCatalogueRegistryProvider.register((i18n: I18nServiceType) => ({
  id: 'infralogging',
  title: i18n('xpack.infra.registerFeatures.logsTitle', {
    defaultMessage: 'Logs',
  }),
  description: i18n('xpack.infra.registerFeatures.logsDescription', {
    defaultMessage:
      'Stream logs in real time or scroll through historical views in a console-like experience.',
  }),
  icon: 'logsApp',
  path: `/app/${APP_ID}#logs`,
  showOnHomePage: true,
  category: FeatureCatalogueCategory.DATA,
}));
