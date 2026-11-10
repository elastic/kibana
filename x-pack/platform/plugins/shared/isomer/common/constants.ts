/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The public route that materializes a saved object into an Isomer composition. */
export const MATERIALIZE_API_PATH = '/api/isomer/materialize';

/** The materialize route's only version. */
export const MATERIALIZE_API_VERSION = '2023-10-31';

/** The public route that turns a selection on a materialized node into Kibana filters. */
export const FILTERS_FOR_SELECTION_API_PATH = '/api/isomer/filters_for_selection';

/** The filters for selection route's only version. */
export const FILTERS_FOR_SELECTION_API_VERSION = '2023-10-31';

/** The internal route that materializes a saved object or config and draws it to a PNG. */
export const RENDER_PNG_API_PATH = '/internal/isomer/render/png';

/** The render PNG route's only version. */
export const RENDER_PNG_API_VERSION = '1';

/** Turns materialization on, in process and over HTTP. Off unless a provider or an override sets it. */
export const MATERIALIZE_FEATURE_FLAG = 'isomer.materializeEnabled';
