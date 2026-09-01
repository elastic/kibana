/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APIReturnType } from '@kbn/streams-plugin/public/api';
import { Streams } from '@kbn/streams-schema';
import { lifecycleToRetentionMs } from '../../../util/lifecycle_to_retention_ms';
import { getDestinationMockMetadata } from './destination_mock_metadata';
import type { Destination } from './types';

export type StreamListItem = APIReturnType<'GET /internal/streams'>['streams'][number];

export interface ClassicStreamDetail extends StreamListItem {
  stream: Streams.ClassicStream.Definition;
}

/**
 * For now destinations mirror what the canvas shows: classic streams only.
 * Wired streams join once the destination model covers them.
 */
export const isDestinationStream = (detail: StreamListItem): detail is ClassicStreamDetail =>
  Streams.ClassicStream.Definition.is(detail.stream);

/**
 * Prototype-only example of an external (non-Elasticsearch) destination.
 * The `s3` destination type has no backend yet, so this is hardcoded to show
 * how external destinations render in the table alongside classic streams.
 */
const MOCK_S3_UPDATED_AT = '2026-01-01T00:00:00.000Z';

const mockS3StreamDefinition: Streams.ClassicStream.Definition = {
  type: 'classic',
  name: 's3-cold-log-archive',
  description: 'Long-term log archive in Amazon S3 (us-east-1).',
  updated_at: MOCK_S3_UPDATED_AT,
  ingest: {
    lifecycle: { dsl: { data_retention: '365d' } },
    processing: { steps: [], updated_at: MOCK_S3_UPDATED_AT },
    settings: {},
    failure_store: { inherit: {} },
    classic: {},
  },
};

export const MOCK_EXTERNAL_S3_DESTINATION: Destination = {
  name: 's3-cold-log-archive',
  type: 's3',
  description: 'Long-term log archive in Amazon S3 (us-east-1).',
  tags: ['archive', 'cold-storage'],
  isManaged: false,
  isInternal: false,
  hasDataStream: false,
  canReadFailureStore: false,
  retention: { dsl: { data_retention: '365d' } },
  retentionMs: 365 * 24 * 60 * 60 * 1000,
  streamDefinition: mockS3StreamDefinition,
  indexMode: 'standard',
};

/**
 * Maps a stream (today's only real destination source) to the Destination view
 * model. Fields without a backend yet come from mock metadata.
 */
export const streamToDestination = (detail: ClassicStreamDetail): Destination => {
  const { tags, isInternal, isManaged } = getDestinationMockMetadata(detail.stream.name);

  return {
    name: detail.stream.name,
    type: 'elasticsearch',
    description: detail.stream.description,
    tags,
    isInternal,
    isManaged,
    hasDataStream: detail.data_stream != null,
    canReadFailureStore: detail.privileges.read_failure_store,
    retention: detail.effective_lifecycle,
    retentionMs: lifecycleToRetentionMs(detail.effective_lifecycle),
    streamDefinition: detail.stream,
    indexMode: detail.data_stream?.index_mode ?? 'standard',
  };
};
