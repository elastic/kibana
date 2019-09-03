/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';
import { i18n } from '@kbn/i18n';
import {
  FeatureCatalogueRegistryProvider,
  FeatureCatalogueCategory
} from 'ui/registry/feature_catalogue';

const { core } = npStart;
const apmUiEnabled = core.injectedMetadata.getInjectedVar('apmUiEnabled');

if (apmUiEnabled) {
  FeatureCatalogueRegistryProvider.register(() => {
    return {
      id: 'apm',
      title: 'APM',
      description: i18n.translate('xpack.apm.apmDescription', {
        defaultMessage:
          'Automatically collect in-depth performance metrics and ' +
          'errors from inside your applications.'
      }),
      icon: 'apmApp',
      path: '/app/apm',
      showOnHomePage: true,
      category: FeatureCatalogueCategory.DATA
    };
  });
}
