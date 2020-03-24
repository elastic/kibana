/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { npSetup } from 'ui/new_platform';
import { FeatureCatalogueCategory } from '../../../../../src/plugins/home/public';

const {
  plugins: { home },
} = npSetup;

home.featureCatalogue.register({
  id: 'uptime',
  title: i18n.translate('xpack.uptime.uptimeFeatureCatalogueTitle', { defaultMessage: 'Uptime' }),
  description: i18n.translate('xpack.uptime.featureCatalogueDescription', {
    defaultMessage: 'Perform endpoint health checks and uptime monitoring.',
  }),
  icon: 'uptimeApp',
  path: `uptime#/`,
  showOnHomePage: true,
  category: FeatureCatalogueCategory.DATA,
});
