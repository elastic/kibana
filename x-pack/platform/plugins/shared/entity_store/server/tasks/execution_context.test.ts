/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEaExecutionContext, EA_EXECUTION_CONTEXT_NAMES } from './execution_context';

describe('buildEaExecutionContext', () => {
  it('returns an execution context tagged as security_solution', () => {
    expect(
      buildEaExecutionContext(EA_EXECUTION_CONTEXT_NAMES.ENTITY_MAINTAINERS_TASK, 'maintainers-id')
    ).toEqual({
      type: 'security_solution',
      name: 'entity_analytics:entity_maintainers_task',
      id: 'maintainers-id',
    });
  });

  it('preserves the name and id verbatim so trace labels match the caller', () => {
    const ctx = buildEaExecutionContext(
      EA_EXECUTION_CONTEXT_NAMES.ENTITY_STORE_EXTRACT_TASK,
      'extract-id'
    );
    expect(ctx.name).toBe('entity_analytics:entity_store_extract_task');
    expect(ctx.id).toBe('extract-id');
  });

  it('returns independent contexts for calls with identical labels', () => {
    const first = buildEaExecutionContext(
      EA_EXECUTION_CONTEXT_NAMES.ENTITY_STORE_STATUS_REPORT_TASK,
      'shared-id'
    );
    const second = buildEaExecutionContext(
      EA_EXECUTION_CONTEXT_NAMES.ENTITY_STORE_STATUS_REPORT_TASK,
      'shared-id'
    );
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });
});

describe('EA_EXECUTION_CONTEXT_NAMES', () => {
  it.each(Object.entries(EA_EXECUTION_CONTEXT_NAMES))(
    'prefixes %s with entity_analytics:',
    (_key, value) => {
      expect(value).toMatch(/^entity_analytics:/);
    }
  );
});
