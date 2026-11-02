/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_VIEWS_FEATURE_ID } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';

export { ESQL_VIEWS_CAPABILITIES } from '@kbn/esql-types';

export const PLUGIN_ID = ESQL_VIEWS_FEATURE_ID;
export const MANAGEMENT_APP_ID = 'esql_views';
export const PLUGIN_NAME = i18n.translate('xpack.esqlViews.pluginName', {
  defaultMessage: 'ES|QL Views',
});
