/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { StreamsStatsTelemetry } from './types';

/**
 * Schema definition for Streams Stats telemetry (stack stats/snapshot telemetry)
 */
export const streamsStatsSchema: MakeSchemaFrom<StreamsStatsTelemetry> = {
  classic_streams: {
    changed_count: {
      type: 'long',
      _meta: {
        description:
          'Number of classic streams that have been modified from their default configuration. Calculated by presence in .kibana_streams (managed) index and type is "classic".',
      },
    },
    with_processing_count: {
      type: 'long',
      _meta: {
        description:
          'Number of classic streams with custom processing steps configured. Calculated by counting streams with non-empty ingest.processing.steps arrays.',
      },
    },
    with_fields_count: {
      type: 'long',
      _meta: {
        description:
          'Number of classic streams with custom field overrides configured. Calculated by counting streams with non-empty ingest.classic.field_overrides objects.',
      },
    },
    with_changed_retention_count: {
      type: 'long',
      _meta: {
        description:
          'Number of classic streams with changed retention. Calculated by confirming stream lifecycle is not "inherited".',
      },
    },
  },
  wired_streams: {
    count: {
      type: 'long',
      _meta: {
        description: 'Total number of wired streams in the system.',
      },
    },
  },
};
