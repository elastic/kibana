/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CelAuthType, Pipeline } from '../../common';
const currentPipelineMock: Pipeline = {
  description: 'Pipeline to process mysql_enterprise audit logs',
  processors: [
    {
      set: {
        field: 'ecs.version',
        value: '8.11.0',
      },
    },
    {
      rename: {
        field: 'message',
        target_field: 'event.original',
        ignore_missing: true,
        if: 'ctx.event?.original == null',
      },
    },
    {
      remove: {
        field: 'event.original',
        tag: 'remove_original_event',
        if: 'ctx?.tags == null || !(ctx.tags.contains("preserve_original_event"))',
        ignore_failure: true,
        ignore_missing: true,
      },
    },
  ],
};

export const mockedRequest = {
  rawSamples: [
    '{ "timestamp": "2020-10-19 19:31:31", "cpu_usage": 0.1, "class": "general", "event": "status", "test_array": ["test1", "test2"]}',
    '{ "timestamp": "2020-10-19 19:32:10", "cpu_usage": 0.2, "class": "connection", "event": "disconnect", "bytes": 16, "account": { "user": "audit_test_user2", "ip": "10.10.10.10" }}',
  ],
  packageName: 'mysql_enterprise',
  dataStreamName: 'audit',
};

export const mockedRequestWithPipeline = {
  rawSamples: [
    '{ "timestamp": "2020-10-19 19:31:31", "cpu_usage": 0.1, "class": "general", "event": "status", "test_array": ["test1", "test2"]}',
    '{ "timestamp": "2020-10-19 19:32:10", "cpu_usage": 0.2, "class": "connection", "event": "disconnect", "bytes": 16, "account": { "user": "audit_test_user2", "ip": "10.10.10.10" }}',
  ],
  packageName: 'mysql_enterprise',
  dataStreamName: 'audit',
  currentPipeline: currentPipelineMock,
};

export const mockedRequestWithCelDetails = {
  dataStreamTitle: 'audit',
  path: '/events',
  authType: 'basic' as CelAuthType,
  openApiDetails: {},
  openApiSchema: {},
  openApiAuthSchema: {},
};

export const mockedApiAnalysisRequest = {
  dataStreamName: 'audit',
  pathOptions: { '/path1': 'path1 description' },
};
