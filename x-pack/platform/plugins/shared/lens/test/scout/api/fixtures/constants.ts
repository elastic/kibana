/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_METRIC_STATE_DEFAULTS } from '@kbn/lens-common';

import type { LensCreateRequestBody } from '../../../../server/api/routes/visualizations/types';

/** Public Lens visualizations API path. Mirrors `LENS_VIS_API_PATH`. */
export const LENS_API_PATH = '/api/visualizations';
/** Lens public API version. Mirrors `LENS_API_VERSION`. */
export const LENS_API_VERSION = '2023-10-31';

/**
 * Common headers for every Lens public-API request.
 * `kbn-xsrf` is required for state-changing requests; harmless for GETs.
 */
export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'elastic-api-version': LENS_API_VERSION,
} as const;

/** `logstash-*` data view referenced by every doc in `lens_example_docs.json`. */
export const SAMPLE_DATA_VIEW_ID = '91200a00-9efd-11e7-acb3-3dab96693fab';

/** First Lens saved object in `lens_example_docs.json` ("Lens example - 1"). */
export const KNOWN_LENS_ID = '71c9c185-3e6d-49d0-b7e5-f966eaf51625';

/** Id that violates the public-API id pattern (uppercase + special chars). */
export const INVALID_LENS_ID = 'invalid-id__$-UPPERCASE';

/** Path to the relocated Lens fixture archive (loaded via `kbnClient.importExport.load`). */
export const LENS_EXAMPLE_DOCS_ARCHIVE =
  'x-pack/platform/plugins/shared/lens/test/scout/api/fixtures/lens_example_docs.json';

/**
 * Builds a minimal valid request body for `POST /api/visualizations` (and the
 * upsert path on `PUT /api/visualizations/{id}`).
 */
export const getExampleLensBody = (
  title = `Lens vis - ${Date.now()} - ${Math.random()}`,
  description = ''
): LensCreateRequestBody => ({
  type: 'metric',
  title,
  description,
  ignore_global_filters: false,
  sampling: 1,
  data_source: { type: 'data_view_reference', ref_id: SAMPLE_DATA_VIEW_ID },
  metrics: [
    {
      type: 'primary',
      operation: 'count',
      label: 'Count of records',
      empty_as_null: true,
    },
  ],
  styling: {
    primary: {
      labels: { alignment: LENS_METRIC_STATE_DEFAULTS.titlesTextAlign },
      value: { alignment: LENS_METRIC_STATE_DEFAULTS.primaryAlign, sizing: 'auto' },
    },
  },
});
