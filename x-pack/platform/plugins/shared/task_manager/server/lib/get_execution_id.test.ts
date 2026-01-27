/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExecutionId } from './get_execution_id';

describe('getExecutionId', () => {
  it('returns the execution id before the "::" separator', () => {
    const executionId = '12345::67890';
    const result = getExecutionId(executionId);
    expect(result).toBe('12345');
  });

  it('returns the full execution id if there is no "::" separator', () => {
    const executionId = '12345';
    const result = getExecutionId(executionId);
    expect(result).toBe('12345');
  });
});
