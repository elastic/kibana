/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { npSetup } from 'ui/new_platform';
import { FeatureCatalogueCategory } from '../../../../../src/plugins/home/public';

npSetup.plugins.home.featureCatalogue.register({
  id: 'painless_playground',
  title: i18n.translate('xpack.painlessPlayground.registryProviderTitle', {
    defaultMessage: 'Painless Playground',
  }),
  description: i18n.translate('xpack.painlessPlayground.registryProviderDescription', {
    defaultMessage: 'Simulate and debug painless code',
  }),
  icon: '',
  path: '/app/kibana#/dev_tools/painless_playground',
  showOnHomePage: false,
  category: FeatureCatalogueCategory.ADMIN,
});
