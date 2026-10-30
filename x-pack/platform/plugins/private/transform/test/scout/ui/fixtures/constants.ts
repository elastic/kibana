/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { TRANSFORM_USERS } from '../../api/fixtures/constants';

export const ES_ARCHIVES = {
  ECOMMERCE: 'x-pack/platform/test/fixtures/es_archives/ml/ecommerce',
  FAREQUOTE: 'x-pack/platform/test/fixtures/es_archives/ml/farequote',
};

export const DATA_VIEWS = {
  ECOMMERCE: { id: 'ft_ecommerce', title: 'ft_ecommerce', timeFieldName: 'order_date' },
  FAREQUOTE: { id: 'ft_farequote', title: 'ft_farequote', timeFieldName: '@timestamp' },
};

export const A11Y_SELECTORS = ['.kbnAppWrapper', '[data-euiportal="true"]'];

/**
 * EUI's virtualized grid body scrolls without being keyboard focusable
 * (`scrollable-region-focusable`), a violation we don't own; FTR hid it through
 * `@kbn/axe-config`'s AXE_CONFIG, which Scout doesn't apply. Same exclusion as Discover's
 * Scout a11y helper. The grid has no test subject or role, so its EUI class is the only handle.
 */
export const A11Y_EXCLUSIONS = ['.euiDataGrid__virtualized'];
