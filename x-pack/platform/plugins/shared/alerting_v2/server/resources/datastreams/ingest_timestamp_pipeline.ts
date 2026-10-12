/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestPipelineDefinition } from './types';

export const INGEST_TIMESTAMP_PIPELINE_VERSION = 1;

/**
 * Sets `@timestamp` with the moment Elasticsearch indexes the document, so
 * producers do not have to and watermark consumers see a timestamp bounded by the
 * refresh interval. Documents that already carry `@timestamp` keep it.
 */
export const getIngestTimestampPipeline = (dataStreamName: string): IngestPipelineDefinition => ({
  id: `${dataStreamName}-ingest-timestamp`,
  version: INGEST_TIMESTAMP_PIPELINE_VERSION,
  processors: [
    {
      set: {
        field: '@timestamp',
        value: '{{{_ingest.timestamp}}}',
        override: false,
      },
    },
  ],
});
