/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { npSetup } from 'ui/new_platform';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FeatureCatalogueCategory } from '../../../../../src/plugins/feature_catalogue/public/services';

npSetup.plugins.feature_catalogue.register({
  id: 'watcher',
  title: 'Watcher', // This is a product name so we don't translate it.
  description: i18n.translate('xpack.watcher.watcherDescription', {
    defaultMessage: 'Detect changes in your data by creating, managing, and monitoring alerts.',
  }),
  icon: 'watchesApp',
  path: '/app/kibana#/management/elasticsearch/watcher/watches',
  showOnHomePage: true,
  category: FeatureCatalogueCategory.ADMIN,
});
