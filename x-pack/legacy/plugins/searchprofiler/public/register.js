/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DevToolsRegistryProvider } from 'ui/registry/dev_tools';

import { i18n } from '@kbn/i18n';

DevToolsRegistryProvider.register(() => ({
  order: 5,
  name: 'searchprofiler',

  display: i18n.translate('xpack.searchProfiler.pageDisplayName', {
    defaultMessage: 'Search Profiler',
  }),

  url: '#/dev_tools/searchprofiler'
}));
