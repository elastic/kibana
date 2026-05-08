/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

export const API_BASE_PATH = 'api/ingest_pipelines';

export const DEFAULT_PROCESSORS = [
  {
    script: {
      source: 'ctx._type = null',
    },
  },
] as const;

export const DEFAULT_ON_FAILURE_PROCESSORS = [
  {
    set: {
      field: 'error.message',
      value: '{{ failure_message }}',
    },
  },
] as const;

export const DEFAULT_METADATA = {
  field_1: 'test',
  field_2: 10,
} as const;

export const createPipelineBodyWithRequiredFields = (name: string) => ({
  name,
  processors: DEFAULT_PROCESSORS,
});

export const createPipelineBody = (name: string) => ({
  name,
  description: 'test pipeline description',
  processors: DEFAULT_PROCESSORS,
  on_failure: DEFAULT_ON_FAILURE_PROCESSORS,
  version: 1,
  _meta: DEFAULT_METADATA,
});

export const createDocuments = () => [
  {
    _index: 'index',
    _id: 'id1',
    _source: {
      foo: 'bar',
    },
  },
  {
    _index: 'index',
    _id: 'id2',
    _source: {
      foo: 'rab',
    },
  },
];
