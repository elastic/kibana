/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';
import { npSetup } from 'ui/new_platform';
import { FeatureCatalogueCategory } from '../../../../../src/plugins/home/public';

const {
  plugins: { home },
} = npSetup;

if (chrome.getInjected('monitoringUiEnabled')) {
  home.featureCatalogue.register({
    id: 'monitoring',
    title: i18n.translate('xpack.monitoring.monitoringTitle', {
      defaultMessage: 'Monitoring',
    }),
    description: i18n.translate('xpack.monitoring.monitoringDescription', {
      defaultMessage: 'Track the real-time health and performance of your Elastic Stack.',
    }),
    icon: 'monitoringApp',
    path: '/app/monitoring',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN,
  });
}
