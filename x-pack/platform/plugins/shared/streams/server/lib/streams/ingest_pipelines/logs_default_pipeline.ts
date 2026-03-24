/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';

export const getLogsOtelPipelineProcessors = (): IngestProcessorContainer[] => [
  {
    set: {
      description: "If '@timestamp' is missing, set it with the ingest timestamp",
      field: '@timestamp',
      override: false,
      copy_from: '_ingest.timestamp',
    },
  },
  {
    // @ts-expect-error @elastic/elasticsearch field - missing in types
    normalize_for_stream: {},
  },
];

export const getLogsEcsPipelineProcessors = (): IngestProcessorContainer[] => [
  {
    set: {
      description: "If '@timestamp' is missing, set it with the ingest timestamp",
      field: '@timestamp',
      override: false,
      copy_from: '_ingest.timestamp',
    },
  },
  // No normalize_for_stream processor - ECS data is expected in correct format
];

// Maintains backward compatibility
export const getLogsDefaultPipelineProcessors = getLogsOtelPipelineProcessors;
