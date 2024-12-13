/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';

import { createExecutionContext } from './create_execution_context';

const coreStartMock = {
  executionContext: {
    getAsLabels: () => ({ page: 'the-page' }),
  },
} as unknown as CoreStart;

describe('createExecutionContext', () => {
  it('returns an execution context based on execution context labels', () => {
    expect(createExecutionContext(coreStartMock, 'the-name')).toEqual({
      type: 'application',
      name: 'the-name',
      id: 'the-page',
      page: 'the-page',
    });
  });

  it('returns an execution context based on a supplied id', () => {
    expect(createExecutionContext(coreStartMock, 'the-name', 'the-id')).toEqual({
      type: 'application',
      name: 'the-name',
      id: 'the-id',
      page: 'the-page',
    });
  });
});
