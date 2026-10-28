/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_EVIDENCE_CHART_ANNOTATIONS,
  MAX_EVIDENCE_CHART_POINTS,
  MAX_EVIDENCE_CHART_SERIES,
  MAX_EVIDENCE_REFERENCES,
  MAX_EVIDENCE_TEXT_LENGTH,
  investigationEvidenceSchema,
  type EvidenceChart,
} from './evidence';

const chart: EvidenceChart = {
  type: 'bar',
  title: 'Errors by service',
  x_axis: { type: 'category', label: 'Service' },
  y_axis: { label: 'Errors', unit: 'number' },
  stacked: true,
  series: [{ name: 'errors', points: [{ x: 'checkout', y: 3 }] }],
  annotations: [{ x: 'checkout', x_end: 'payments', label: 'Affected' }],
};

describe('investigationEvidenceSchema', () => {
  it('accepts Markdown, a chart, both, or neither', () => {
    expect(investigationEvidenceSchema.safeParse({ description: '**bold**' }).success).toBe(true);
    expect(investigationEvidenceSchema.safeParse({ chart }).success).toBe(true);
    expect(investigationEvidenceSchema.safeParse({ description: 'x', chart }).success).toBe(true);
    expect(investigationEvidenceSchema.safeParse({}).success).toBe(true);
  });

  it('bounds the description', () => {
    expect(
      investigationEvidenceSchema.safeParse({
        description: 'x'.repeat(MAX_EVIDENCE_TEXT_LENGTH + 1),
      }).success
    ).toBe(false);
  });

  it('bounds series, points, and annotations', () => {
    const series = Array.from({ length: MAX_EVIDENCE_CHART_SERIES + 1 }, (_, index) => ({
      name: `s${index}`,
      points: [],
    }));
    const points = Array.from({ length: MAX_EVIDENCE_CHART_POINTS + 1 }, (_, index) => ({
      x: `${index}`,
      y: index,
    }));
    const annotations = Array.from({ length: MAX_EVIDENCE_CHART_ANNOTATIONS + 1 }, () => ({
      x: 'checkout',
      label: 'a',
    }));

    expect(investigationEvidenceSchema.safeParse({ chart: { ...chart, series } }).success).toBe(
      false
    );
    expect(
      investigationEvidenceSchema.safeParse({
        chart: { ...chart, series: [{ name: 'errors', points }] },
      }).success
    ).toBe(false);
    expect(
      investigationEvidenceSchema.safeParse({ chart: { ...chart, annotations } }).success
    ).toBe(false);
    expect(investigationEvidenceSchema.safeParse({ chart: { ...chart, series: [] } }).success).toBe(
      false
    );
  });

  it('rejects unknown chart types and units', () => {
    expect(
      investigationEvidenceSchema.safeParse({ chart: { ...chart, type: 'pie' } }).success
    ).toBe(false);
    expect(
      investigationEvidenceSchema.safeParse({ chart: { ...chart, y_axis: { unit: 'kg' } } }).success
    ).toBe(false);
  });
});

describe('evidence references', () => {
  it('accepts http(s) links, with or without a label, and queries', () => {
    expect(
      investigationEvidenceSchema.safeParse({
        references: [
          { url: 'https://github.com/elastic/kibana/pull/1', label: 'PR' },
          { url: 'https://example.com' },
          { query: 'FROM logs-* | LIMIT 10' },
        ],
      }).success
    ).toBe(true);
  });

  it('rejects non-http links, empty queries, mixed or unknown shapes, and too many references', () => {
    const parse = (references: unknown[]) =>
      investigationEvidenceSchema.safeParse({ references }).success;

    expect(parse([{ url: 'ftp://example.com/file' }])).toBe(false);
    expect(parse([{ query: '' }])).toBe(false);
    expect(parse([{ query: 'FROM logs-*', language: 'esql' }])).toBe(false);
    expect(parse([{ url: 'https://example.com', query: 'FROM logs-*' }])).toBe(false);
    expect(parse([{ trace: 'abc' }])).toBe(false);
    expect(
      parse(
        Array.from({ length: MAX_EVIDENCE_REFERENCES + 1 }, () => ({ url: 'https://example.com' }))
      )
    ).toBe(false);
  });
});
