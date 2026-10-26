/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import { resolveErrorSource } from './error_source';

describe('resolveErrorSource', () => {
  it('returns user for an error tagged as a user error', () => {
    const error = createTaskRunError(new Error('bad query'), TaskErrorSource.USER);

    expect(resolveErrorSource(error)).toBe('user');
  });

  it('returns framework for an error tagged as a framework error', () => {
    const error = createTaskRunError(new Error('boom'), TaskErrorSource.FRAMEWORK);

    expect(resolveErrorSource(error)).toBe('framework');
  });

  it('returns framework for an error with no source', () => {
    expect(resolveErrorSource(new Error('boom'))).toBe('framework');
  });

  it('returns framework for a value that is not an Error', () => {
    expect(resolveErrorSource('boom')).toBe('framework');
    expect(resolveErrorSource(undefined)).toBe('framework');
  });
});
