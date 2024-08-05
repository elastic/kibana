/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EditorEndpoints } from './json_schema_service';
import type { PropertyDefinition } from './types';

/**
 * Extension of the schema definition extracted from the Elasticsearch specification.
 */
export const jsonSchemaOverrides: Partial<Record<EditorEndpoints, Partial<PropertyDefinition>>> = {
  '/_ml/anomaly_detectors/{job_id}': {
    // background_persist_interval is required according to the ES spec
    required: ['analysis_config', 'data_description'],
    properties: {
      job_id: {
        type: 'string',
        description: 'Identifier for the anomaly detection job.',
      },
    },
  },
  '/_ml/datafeeds/{datafeed_id}': {
    properties: {
      datafeed_id: {
        type: 'string',
      },
    },
  },
};
