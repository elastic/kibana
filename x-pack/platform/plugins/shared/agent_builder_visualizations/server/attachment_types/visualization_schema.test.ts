/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_VEGA_SPEC_LENGTH, visualizationAttachmentDataSchema } from './visualization_schema';

describe('visualizationAttachmentDataSchema', () => {
  it('accepts a Lens attachment with an explicit renderer', () => {
    const result = visualizationAttachmentDataSchema.safeParse({
      renderer: 'lens',
      query: 'count by host',
      visualization: { title: 'Hosts' },
      chart_type: 'xy',
      esql: 'FROM logs | STATS count() BY host',
    });

    expect(result.success).toBe(true);
  });

  it('accepts a legacy Lens attachment without a renderer (backwards compatible)', () => {
    const result = visualizationAttachmentDataSchema.safeParse({
      query: 'count by host',
      visualization: { title: 'Hosts' },
      chart_type: 'xy',
      esql: 'FROM logs | STATS count() BY host',
    });

    expect(result.success).toBe(true);
  });

  it('accepts a Vega attachment carrying a spec', () => {
    const result = visualizationAttachmentDataSchema.safeParse({
      renderer: 'vega',
      query: 'faceted bars by host',
      visualization: { spec: '{"$schema":"https://vega.github.io/schema/vega-lite/v6.json"}' },
      esql: 'FROM logs | STATS count() BY host',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a Vega attachment that is missing its spec', () => {
    const result = visualizationAttachmentDataSchema.safeParse({
      renderer: 'vega',
      query: 'faceted bars by host',
      visualization: {},
      esql: 'FROM logs | STATS count() BY host',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a Lens attachment that is missing its visualization config', () => {
    const result = visualizationAttachmentDataSchema.safeParse({
      renderer: 'lens',
      query: 'count by host',
      chart_type: 'xy',
      esql: 'FROM logs | STATS count() BY host',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an unbounded query string', () => {
    const result = visualizationAttachmentDataSchema.safeParse({
      renderer: 'lens',
      query: 'a'.repeat(2049),
      visualization: { title: 'Hosts' },
      esql: 'FROM logs | STATS count() BY host',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a Vega attachment whose spec exceeds the maximum length', () => {
    const result = visualizationAttachmentDataSchema.safeParse({
      renderer: 'vega',
      query: 'faceted bars by host',
      visualization: { spec: 'x'.repeat(MAX_VEGA_SPEC_LENGTH + 1) },
      esql: 'FROM logs | STATS count() BY host',
    });

    expect(result.success).toBe(false);
  });

  it('accepts a Vega attachment whose spec is at the maximum length', () => {
    const result = visualizationAttachmentDataSchema.safeParse({
      renderer: 'vega',
      query: 'faceted bars by host',
      visualization: { spec: 'x'.repeat(MAX_VEGA_SPEC_LENGTH) },
      esql: 'FROM logs | STATS count() BY host',
    });

    expect(result.success).toBe(true);
  });
});
