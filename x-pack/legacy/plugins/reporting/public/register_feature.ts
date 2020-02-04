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
  id: 'reporting',
  title: i18n.translate('xpack.reporting.registerFeature.reportingTitle', {
    defaultMessage: 'Reporting',
  }),
  description: i18n.translate('xpack.reporting.registerFeature.reportingDescription', {
    defaultMessage: 'Manage your reports generated from Discover, Visualize, and Dashboard.',
  }),
  icon: 'reportingApp',
  path: '/app/kibana#/management/kibana/reporting',
  showOnHomePage: false,
  category: FeatureCatalogueCategory.ADMIN,
});
