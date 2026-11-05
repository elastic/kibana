/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// `esql.view_created` is registered by `@kbn/esql-editor`, which can emit it even when this
// management UI is disabled; this plugin only reports it. `esql.view_selected` completes the set
// and is registered and reported by the editor alone.
export const ESQL_VIEWS_PAGE_VISITED = 'esql.views_page_visited';
export const ESQL_VIEW_CREATED = 'esql.view_created';
export const ESQL_VIEW_EDITED = 'esql.view_edited';
export const ESQL_VIEW_DELETED = 'esql.view_deleted';

/** The UI surface these events are reported from. */
export const ESQL_VIEWS_TELEMETRY_SOURCE = 'stack_management';
