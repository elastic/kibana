/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

import { i18n } from '@kbn/i18n';

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'grokdebugger',
    title: i18n.translate('xpack.grokDebugger.registryProviderTitle', {
      defaultMessage: '{grokLogParsingTool} Debugger',
      values: {
        grokLogParsingTool: 'Grok'
      }
    }),
    description: i18n.translate('xpack.grokDebugger.registryProviderDescription', {
      defaultMessage: 'Simulate and debug {grokLogParsingTool} patterns for data transformation on ingestion.',
      values: {
        grokLogParsingTool: 'grok'
      }
    }),
    icon: 'grokApp',
    path: '/app/kibana#/dev_tools/grokdebugger',
    showOnHomePage: false,
    category: FeatureCatalogueCategory.ADMIN
  };
});
