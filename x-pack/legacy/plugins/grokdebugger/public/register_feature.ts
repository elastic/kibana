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
  id: 'grokdebugger',
  title: i18n.translate('xpack.grokDebugger.registryProviderTitle', {
    defaultMessage: '{grokLogParsingTool} Debugger',
    values: {
      grokLogParsingTool: 'Grok',
    },
  }),
  description: i18n.translate('xpack.grokDebugger.registryProviderDescription', {
    defaultMessage:
      'Simulate and debug {grokLogParsingTool} patterns for data transformation on ingestion.',
    values: {
      grokLogParsingTool: 'grok',
    },
  }),
  icon: 'grokApp',
  path: '/app/kibana#/dev_tools/grokdebugger',
  showOnHomePage: false,
  category: FeatureCatalogueCategory.ADMIN,
});
