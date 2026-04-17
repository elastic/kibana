/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INTEGRATION_SAVED_OBJECT_TYPE = 'integration-config';
export const DATA_STREAM_SAVED_OBJECT_TYPE = 'data_stream-config';

export const TASK_STATUSES = {
  pending: 'pending',
  processing: 'processing',
  completed: 'completed',
  approved: 'approved',
  failed: 'failed',
  cancelled: 'cancelled',
  deleting: 'deleting',
} as const;

export const INPUT_TYPES = {
  awsCloudwatch: 'aws-cloudwatch',
  awsS3: 'aws-s3',
  azureBlobStorage: 'azure-blob-storage',
  azureEventhub: 'azure-eventhub',
  cel: 'cel',
  cloudfoundry: 'cloudfoundry',
  filestream: 'filestream',
  gcpPubsub: 'gcp-pubsub',
  gcs: 'gcs',
  httpEndpoint: 'http_endpoint',
  journald: 'journald',
  kafka: 'kafka',
  tcp: 'tcp',
  udp: 'udp',
} as const;

// Saved Objects Operations
export const BULK_DELETE_CHUNK_SIZE = 50;
