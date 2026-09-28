/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PLUGIN_ID = 'esqlViews';
export const MANAGEMENT_APP_ID = 'esql_views';
export const PLUGIN_NAME = i18n.translate('xpack.esqlViews.pluginName', {
  defaultMessage: 'ES|QL Views',
});

export const ESQL_VIEWS_CAPABILITIES = {
  read: 'read',
  create: 'create',
  edit: 'edit',
  delete: 'delete',
} as const;
