/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PLUGIN_ID = 'esqlViews';

export const PLUGIN_NAME = i18n.translate('esqlViews.pluginName', {
  defaultMessage: 'ES|QL Views',
});

export const LIST_BREADCRUMB = [
  {
    text: PLUGIN_NAME,
    href: '#/management/kibana/esqlViews',
  },
];

/**
 * Internal API for reading/writing a single ES|QL view. Proxies to Elasticsearch's
 * `_query/view` API (the same one the Streams plugin uses internally for query streams),
 * which only persists `{ name, query }` \u2014 no description or ownership metadata.
 */
export const VIEWS_API_ROUTE = '/internal/esql_views/views';

export const getViewApiPath = (name: string): string =>
  `${VIEWS_API_ROUTE}/${encodeURIComponent(name)}`;
