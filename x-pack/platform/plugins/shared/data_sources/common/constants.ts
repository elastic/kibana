/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DATA_SOURCES_APP_ID = 'data_sources';

export const DATA_SOURCES_FULL_TITLE = i18n.translate('xpack.dataSources.app.fullTitle', {
  defaultMessage: 'Sources',
});
export const DATA_SOURCES_SHORT_TITLE = i18n.translate('xpack.dataSources.app.shortTitle', {
  defaultMessage: 'Sources',
});

export const API_BASE_PATH = '/api/data_sources';
export const STACK_CONNECTOR_API_ROUTE = '/api/actions/connector';

// Pagination constants
export const DEFAULT_ITEMS_PER_PAGE = 10;
export const PAGINATION_ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
