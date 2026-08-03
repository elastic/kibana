/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_API_VERSION, LENS_VIS_API_PATH } from '../../../../common/constants';
import type { LensCreateRequestBody } from '../../../../server/api/routes/visualizations/types';

/** Lens visualizations API path. Mirrors `LENS_VIS_API_PATH`. */
export const LENS_API_PATH = LENS_VIS_API_PATH;
/** Lens API version. Mirrors `LENS_API_VERSION`. */
export { LENS_API_VERSION };

/**
 * Common headers for every Lens API request.
 * `kbn-xsrf` is required for state-changing requests; harmless for GETs.
 */
export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': LENS_API_VERSION,
} as const;

/** `logstash-*` data view referenced by every doc in `lens_example_docs.json`. */
export const SAMPLE_DATA_VIEW_ID = '91200a00-9efd-11e7-acb3-3dab96693fab';

/** First Lens saved object in `lens_example_docs.json` ("Lens example - 1"). */
export const KNOWN_LENS_ID = '71c9c185-3e6d-49d0-b7e5-f966eaf51625';

/** Path to the relocated Lens fixture archive (loaded via `kbnClient.importExport.load`). */
export const LENS_EXAMPLE_DOCS_ARCHIVE =
  'x-pack/platform/plugins/shared/lens/test/scout/api/fixtures/lens_example_docs.json';

/**
 * Builds a minimal valid request body for `POST /api/lens/visualizations`
 * (and the upsert path on `PUT /api/lens/visualizations/{id}`). Mirrors the
 * legacy attribute shape the original FTR test used so it stays compatible
 * with the 9.3 `lensCreateRequestBodySchema` (accepts `lensItemDataSchemaV0`).
 */
export const getExampleLensBody = (
  title = `Lens vis - ${Date.now()} - ${Math.random()}`,
  description = ''
): LensCreateRequestBody => ({
  title,
  description,
  visualizationType: 'lnsMetric',
  state: {
    visualization: {
      layerId: '32e889c6-89f9-4873-b1f7-d5bea381c582',
      layerType: 'data',
      metricAccessor: '1c6729bc-ec92-4000-8dcc-0fdd7b56d5b8',
      secondaryTrend: {
        type: 'none',
      },
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '32e889c6-89f9-4873-b1f7-d5bea381c582': {
            columns: {
              '1c6729bc-ec92-4000-8dcc-0fdd7b56d5b8': {
                label: 'Count of records',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                scale: 'ratio',
                sourceField: '___records___',
                params: {
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: ['1c6729bc-ec92-4000-8dcc-0fdd7b56d5b8'],
            incompleteColumns: {
              'd0b92889-f74c-4194-b738-76eb5d268524': {
                operationType: 'date_histogram',
              },
            },
            sampling: 1,
          },
        },
      },
      indexpattern: {
        layers: {},
      },
      textBased: {
        layers: {},
      },
    },
    internalReferences: [],
    adHocDataViews: {},
    isNewApiFormat: true, // temporary flag
  },
  references: [
    {
      type: 'index-pattern',
      id: SAMPLE_DATA_VIEW_ID,
      name: 'indexpattern-datasource-layer-32e889c6-89f9-4873-b1f7-d5bea381c582',
    },
  ],
});
