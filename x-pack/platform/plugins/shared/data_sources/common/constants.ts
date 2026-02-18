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

// Task Manager constants
export const DATASOURCES_SCOPE = 'dataSources';
export const WORKFLOWS_SCOPE = 'workflows';
export const TOOLS_SCOPE = 'tools';
export const FAKE_REQUEST_NOT_DEFINED_ERROR = 'fakeRequest is not defined';

// Error and success messages
export const PARTIALLY_DELETED_ERROR = 'Partially deleted: some resources failed to delete';
export const TASK_NOT_FOUND_ERROR = 'Task not found';
export const TASK_MANAGER_NOT_AVAILABLE_ERROR = 'Task Manager is not available';
