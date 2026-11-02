/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PLUGIN_ID = 'notebook';
export const APP_ID = 'notebook';
export const APP_ROUTE = '/app/notebook';
export const NOTEBOOK_SAVED_OBJECT_TYPE = 'notebook';
export const NOTEBOOK_API_BASE_PATH = '/internal/notebook';
export const MAX_DESCRIPTION_LENGTH = 10_000;

export const PLUGIN_NAME = i18n.translate('xpack.notebook.pluginName', {
  defaultMessage: 'Notebooks',
});
