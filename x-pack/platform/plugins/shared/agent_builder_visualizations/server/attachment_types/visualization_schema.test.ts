/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CUSTOM_CONTENT_MAX_TEMPLATE_BYTES } from '@kbn/custom-content-common';
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

  // `esql` is optional on the object so custom content can be static. These two
  // guard the guarantee that widening it did not weaken the chart renderers.
  it('rejects a Lens attachment with no esql', () => {
    const result = visualizationAttachmentDataSchema.safeParse({
      renderer: 'lens',
      query: 'count by host',
      visualization: { title: 'Hosts' },
      chart_type: 'xy',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a Vega attachment with no esql', () => {
    const result = visualizationAttachmentDataSchema.safeParse({
      renderer: 'vega',
      query: 'faceted bars by host',
      visualization: { spec: '{"$schema":"https://vega.github.io/schema/vega-lite/v6.json"}' },
    });

    expect(result.success).toBe(false);
  });

  describe('custom content', () => {
    it('accepts a custom content attachment backed by a query', () => {
      const result = visualizationAttachmentDataSchema.safeParse({
        renderer: 'custom_content',
        query: 'a status board per host',
        visualization: { template: '<div>{{ row["host"].value }}</div>' },
        esql: 'FROM logs | STATS count() BY host',
      });

      expect(result.success).toBe(true);
    });

    it('accepts a static custom content attachment with no esql', () => {
      const result = visualizationAttachmentDataSchema.safeParse({
        renderer: 'custom_content',
        query: 'a welcome banner',
        visualization: { template: '<div>Welcome</div>' },
      });

      expect(result.success).toBe(true);
    });

    it('rejects a custom content attachment with no template', () => {
      const result = visualizationAttachmentDataSchema.safeParse({
        renderer: 'custom_content',
        query: 'a status board per host',
        visualization: {},
      });

      expect(result.success).toBe(false);
    });

    it('rejects a custom content attachment with an empty template', () => {
      const result = visualizationAttachmentDataSchema.safeParse({
        renderer: 'custom_content',
        query: 'a status board per host',
        visualization: { template: '' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a template containing a script tag', () => {
      const result = visualizationAttachmentDataSchema.safeParse({
        renderer: 'custom_content',
        query: 'a status board per host',
        visualization: { template: '<div><script>alert(1)</script></div>' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a template that exceeds the byte limit', () => {
      const result = visualizationAttachmentDataSchema.safeParse({
        renderer: 'custom_content',
        query: 'a status board per host',
        // Multi-byte characters: under the character cap, over the byte cap.
        visualization: { template: '€'.repeat(CUSTOM_CONTENT_MAX_TEMPLATE_BYTES / 2) },
      });

      expect(result.success).toBe(false);
    });
  });
});
