/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  exportQuerySchema,
  exportRequestBodySchema,
  exportScheduledQueryParamsSchema,
} from './export_request_body_schema';
const SUPPORTED_EXPORT_FORMATS = ['ndjson', 'json', 'csv'] as const;

describe('exportRequestBodySchema', () => {
  it('accepts null (body omitted)', () => {
    expect(() => exportRequestBodySchema.validate(null)).not.toThrow();
    expect(exportRequestBodySchema.validate(null)).toBeNull();
  });

  it('accepts an empty object', () => {
    const result = exportRequestBodySchema.validate({});
    expect(result).toEqual({});
  });

  it('accepts a fully specified body', () => {
    const result = exportRequestBodySchema.validate({
      kuery: 'agent.id: "abc"',
      agentIds: ['agent-1', 'agent-2'],
      esFilters: [{ match_all: {} }],
    });
    expect(result).toEqual({
      kuery: 'agent.id: "abc"',
      agentIds: ['agent-1', 'agent-2'],
      esFilters: [{ match_all: {} }],
    });
  });

  it('accepts a body with only kuery', () => {
    const result = exportRequestBodySchema.validate({ kuery: 'host.name: "my-host"' });
    expect(result).toEqual({ kuery: 'host.name: "my-host"' });
  });

  it('accepts a body with only agentIds', () => {
    const result = exportRequestBodySchema.validate({ agentIds: ['id-1'] });
    expect(result).toEqual({ agentIds: ['id-1'] });
  });

  it('accepts a body with only esFilters', () => {
    const result = exportRequestBodySchema.validate({
      esFilters: [{ term: { 'agent.id': 'abc' } }],
    });
    expect(result).toEqual({ esFilters: [{ term: { 'agent.id': 'abc' } }] });
  });

  it('rejects agentIds when not an array', () => {
    expect(() => exportRequestBodySchema.validate({ agentIds: 'not-an-array' })).toThrow();
  });

  it('rejects kuery when not a string', () => {
    expect(() => exportRequestBodySchema.validate({ kuery: 123 })).toThrow();
  });

  it('rejects unknown keys', () => {
    expect(() => exportRequestBodySchema.validate({ unknownField: 'value' })).toThrow();
  });

  it('rejects esFilters when not an array', () => {
    expect(() =>
      exportRequestBodySchema.validate({ esFilters: { term: { 'agent.id': 'x' } } })
    ).toThrow();
  });

  it('accepts esFilters with exactly 100 entries', () => {
    const filters = Array.from({ length: 100 }, (_, i) => ({ match_all: { index: i } }));
    expect(() => exportRequestBodySchema.validate({ esFilters: filters })).not.toThrow();
  });

  it('rejects esFilters with 101 entries', () => {
    const filters = Array.from({ length: 101 }, (_, i) => ({ match_all: { index: i } }));
    expect(() => exportRequestBodySchema.validate({ esFilters: filters })).toThrow(
      /array size is \[101\]/
    );
  });
});

describe('exportQuerySchema', () => {
  it.each(SUPPORTED_EXPORT_FORMATS)('accepts format "%s"', (fmt) => {
    expect(() => exportQuerySchema.validate({ format: fmt })).not.toThrow();
  });

  it('rejects an unsupported format value', () => {
    expect(() => exportQuerySchema.validate({ format: 'xml' })).toThrow();
  });

  it('rejects a missing format', () => {
    expect(() => exportQuerySchema.validate({})).toThrow();
  });
});

describe('exportScheduledQueryParamsSchema', () => {
  it('accepts a valid scheduleId and non-negative executionCount', () => {
    expect(() =>
      exportScheduledQueryParamsSchema.validate({ scheduleId: 'sched-uuid-1', executionCount: 0 })
    ).not.toThrow();
    expect(() =>
      exportScheduledQueryParamsSchema.validate({ scheduleId: 'sched-uuid-1', executionCount: 42 })
    ).not.toThrow();
  });

  it('rejects a negative executionCount', () => {
    expect(() =>
      exportScheduledQueryParamsSchema.validate({ scheduleId: 'sched-uuid-1', executionCount: -1 })
    ).toThrow();
  });

  it('rejects a missing scheduleId', () => {
    expect(() => exportScheduledQueryParamsSchema.validate({ executionCount: 1 })).toThrow();
  });
});
