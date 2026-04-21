/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PLUGIN_ID = 'data_source_management';

export const PLUGIN_NAME = i18n.translate('dataSourceManagement.pluginName', {
  defaultMessage: 'Data sources',
});

export const LIST_BREADCRUMB = [
  {
    text: PLUGIN_NAME,
    href: '#/management/kibana/data_source_management',
  },
];
