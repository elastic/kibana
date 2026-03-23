/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DATA_STREAM_CREATION_TASK_TYPE,
  TaskManagerService,
  isUnrecoverableByStatus,
  type DataStreamParams,
} from './task_manager_service';

describe('TaskManagerService', () => {
  it('exports DATA_STREAM_CREATION_TASK_TYPE', () => {
    expect(DATA_STREAM_CREATION_TASK_TYPE).toBe('autoImport-dataStream-task');
  });

  it('exports TaskManagerService', () => {
    expect(TaskManagerService).toBeDefined();
  });

  it('DataStreamParams has required fields', () => {
    const params: DataStreamParams = { integrationId: 'a', dataStreamId: 'b' };
    expect(params.integrationId).toBe('a');
    expect(params.dataStreamId).toBe('b');
  });
});

describe('isUnrecoverableByStatus', () => {
  it('returns false for 200 and 201', () => {
    expect(isUnrecoverableByStatus(Object.assign(new Error(), { statusCode: 200 }))).toBe(false);
    expect(isUnrecoverableByStatus(Object.assign(new Error(), { statusCode: 201 }))).toBe(false);
  });

  it('returns true for any other status code', () => {
    expect(isUnrecoverableByStatus(Object.assign(new Error(), { statusCode: 400 }))).toBe(true);
    expect(isUnrecoverableByStatus(Object.assign(new Error(), { statusCode: 404 }))).toBe(true);
    expect(isUnrecoverableByStatus(Object.assign(new Error(), { statusCode: 500 }))).toBe(true);
  });

  it('reads status from meta.status and output.statusCode', () => {
    expect(isUnrecoverableByStatus({ meta: { status: 404 } })).toBe(true);
    expect(isUnrecoverableByStatus({ output: { statusCode: 400 } })).toBe(true);
    expect(isUnrecoverableByStatus({ meta: { status: 200 } })).toBe(false);
  });

  it('returns false when no status code (retry)', () => {
    expect(isUnrecoverableByStatus(new Error('timeout'))).toBe(false);
    expect(isUnrecoverableByStatus(null)).toBe(false);
    expect(isUnrecoverableByStatus(undefined)).toBe(false);
  });
});
