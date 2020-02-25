/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { npSetup } from 'ui/new_platform';
import { FeatureCatalogueCategory } from '../../../../../src/plugins/home/public';

npSetup.plugins.home.featureCatalogue.register({
  id: 'ml',
  title: i18n.translate('xpack.ml.machineLearningTitle', {
    defaultMessage: 'Machine Learning',
  }),
  description: i18n.translate('xpack.ml.machineLearningDescription', {
    defaultMessage:
      'Automatically model the normal behavior of your time series data to detect anomalies.',
  }),
  icon: 'machineLearningApp',
  path: '/app/ml',
  showOnHomePage: true,
  category: FeatureCatalogueCategory.DATA,
});

npSetup.plugins.home.environment.update({
  ml: npSetup.core.injectedMetadata.getInjectedVar('mlEnabled') as boolean,
});
