/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentAnalysis } from '@kbn/ai-tools';
import { formatDatasetAnalysis } from './format_dataset_analysis';

type AnalyzedField = DocumentAnalysis['fields'][number];

const SAMPLED = 100;

const field = (
  name: string,
  type: string,
  counts: Record<string, number> | Array<[number, number]>,
  fingerprint: string = name,
  partition: string = fingerprint
): AnalyzedField => {
  const values = Array.isArray(counts)
    ? counts.map(([value, count]) => ({ value, count }))
    : Object.entries(counts).map(([value, count]) => ({ value, count }));
  const documentsWithValue = Math.min(
    SAMPLED,
    values.reduce((sum, { count }) => sum + count, 0)
  );
  return {
    name,
    types: [type],
    cardinality: values.length,
    values,
    empty: documentsWithValue === 0,
    documentsWithValue,
    fingerprint,
    partition,
  };
};

const format = (fields: AnalyzedField[], conflicts = {}) =>
  formatDatasetAnalysis({ total: 5000, sampled: SAMPLED, fields }, { conflicts });

describe('formatDatasetAnalysis', () => {
  it('lists key fields first, in a fixed order, whatever their distribution', () => {
    const noise = Array.from({ length: 400 }, (_, index) =>
      field(`noise.field_${index}`, 'keyword', { a: 50, b: 30, c: 20 })
    );

    const { fields, other_fields: otherFields } = format([
      ...noise,
      field('data_stream.dataset', 'keyword', { app: 100 }),
      field('error.message', 'text', { boom: 1 }),
      field('log.level', 'keyword', { info: 100 }),
      field('message', 'text', { hello: 1, world: 1 }),
    ]);

    expect(Object.keys(fields).slice(0, 4)).toEqual([
      'message (text)',
      'log.level (keyword)',
      'error.message (text)',
      'data_stream.dataset (keyword)',
    ]);
    expect(fields['log.level (keyword)']).toEqual(['info (100%)']);
    expect(fields['error.message (text)']).toEqual(['boom (1%)', '(no value) (99%)']);
    expect(otherFields?.length).toBeGreaterThan(0);
  });

  it('is deterministic for the same analysis in a different field order', () => {
    const fields = Array.from({ length: 300 }, (_, index) =>
      field(`field_${index}`, 'keyword', { a: 50 + (index % 40), b: 10 })
    );

    expect(JSON.stringify(format([...fields].reverse()))).toEqual(JSON.stringify(format(fields)));
  });

  it('merges fields holding the same values on the same documents', () => {
    const { fields } = format([
      field('resource.attributes.service.name', 'keyword', { api: 60, web: 40 }, 'same'),
      field('service.name', 'keyword', { api: 60, web: 40 }, 'same'),
      field('url.path.text', 'text', { '/a': 40, '/b': 30, '/c': 30 }, 'path'),
      field('url.path', 'keyword', { '/a': 40, '/b': 30, '/c': 30 }, 'path'),
      field('other', 'keyword', { api: 60, web: 40 }),
    ]);

    expect(fields).toEqual({
      'service.name (keyword) = resource.attributes.service.name (keyword)': [
        'api (60%)',
        'web (40%)',
      ],
      'url.path (keyword) = url.path.text (text)': ['/a (40%)', '/b (30%)', '/c (30%)'],
      'other (keyword)': ['api (60%)', 'web (40%)'],
    });
  });

  it('points one-to-one fields at the field carrying the distribution', () => {
    const shares = [40, 20, 15, 10, 8, 7];
    const counts = (prefix: string) =>
      Object.fromEntries(shares.map((share, index) => [`${prefix}-${index}`, share]));

    const { fields } = format([
      field('kubernetes.pod.uid', 'keyword', counts('uid'), 'uid', 'pod'),
      field('kubernetes.pod.name', 'keyword', counts('pod'), 'name', 'pod'),
      field('flag.a', 'boolean', { true: 50, false: 50 }, 'a', 'flag'),
      field('flag.b', 'boolean', { yes: 50, no: 50 }, 'b', 'flag'),
    ]);

    expect(fields).toEqual({
      'kubernetes.pod.uid (keyword)': [
        'uid-0 (40%)',
        'uid-1 (20%)',
        'uid-2 (15%)',
        'uid-3 (10%)',
        'uid-4 (8%)',
        '... (+1 more)',
      ],
      'kubernetes.pod.name (keyword)': ['pod-0 (40%)', 'one value per kubernetes.pod.uid'],
      'flag.a (boolean)': ['false (50%)', 'true (50%)'],
      'flag.b (boolean)': ['no (50%)', 'yes (50%)'],
    });
  });

  it('lists sparse non-key fields by name only', () => {
    const result = formatDatasetAnalysis({
      total: 5000,
      sampled: 1000,
      fields: [
        { ...field('container.runtime', 'keyword', { containerd: 2 }), documentsWithValue: 2 },
        { ...field('error.exception.type', 'keyword', { Boom: 2 }), documentsWithValue: 2 },
      ],
    });

    expect(result.fields).toEqual({
      'error.exception.type (keyword)': ['Boom (<1%)', '(no value) (>99%)'],
    });
    expect(result.other_fields).toEqual(['container.runtime']);
  });

  it('collapses constants and lists bookkeeping fields by name only', () => {
    const result = format([
      field('cloud.provider', 'keyword', { gcp: 100 }),
      field('agent.id', 'keyword', { a: 50, b: 50 }),
      field('log.offset', 'long', [
        [1, 50],
        [2, 50],
      ]),
      ...['zone', 'region', 'role', 'pool'].map((label) =>
        field(`kubernetes.node.labels.${label}`, 'keyword', { a: 100 })
      ),
      field('http.request.method', 'keyword', { GET: 70, POST: 30 }),
    ]);

    expect(result.fields).toEqual({
      'http.request.method (keyword)': ['GET (70%)', 'POST (30%)'],
    });
    expect(result.constant_fields).toEqual({ 'cloud.provider (keyword)': 'gcp' });
    expect(result.other_fields).toEqual([
      'agent.id',
      'kubernetes.node.labels.* (4 fields)',
      'log.offset (long)',
    ]);
  });

  it('summarises a numeric field with many values by its range', () => {
    const durations = Array.from({ length: 200 }, (_, index): [number, number] => [index + 1, 0.4]);

    expect(
      format([field('event.duration', 'long', [[5000, 20], ...durations])]).fields[
        'event.duration (long)'
      ]
    ).toEqual(['5000 (20%)', '... (+200 more)', 'range: min 1, p50 126, p95 5000, max 5000']);
  });

  it('annotates union-typed fields with the recommended cast', () => {
    const { fields } = format(
      [
        field('exception.message', 'keyword', { a: 60, b: 40 }),
        field('host.name', 'keyword', { a: 60, b: 40 }),
      ],
      {
        'exception.message': { types: ['keyword', 'text'], suggestedCast: 'keyword' },
        'host.name': { types: ['ip', 'keyword'] },
      }
    );

    expect(Object.keys(fields)).toEqual([
      'exception.message (keyword, text - recommended: keyword)',
      'host.name (ip, keyword - ambiguous, no safe cast)',
    ]);
  });

  it('drops fields without values and stays within budget on wide datasets', () => {
    const many = Array.from({ length: 2000 }, (_, index) =>
      field(`group_${index % 500}.some_long_field_name_${index}`, 'keyword', { a: 60, b: 40 })
    );

    const result = format([
      ...many,
      field('rpc.status_code', 'keyword', { OK: 99, CANCELED: 1 }),
      { ...field('empty.field', 'keyword', {}), empty: true },
    ]);

    expect(Object.keys(result.fields)[0]).toBe('rpc.status_code (keyword)');
    expect(JSON.stringify(result)).not.toContain('empty.field');
    expect(JSON.stringify(result).length).toBeLessThan(13_000);
    expect(result.other_fields?.[result.other_fields.length - 1]).toMatch(
      /^\.\.\. \(\+\d+ more\)$/
    );
  });
});
