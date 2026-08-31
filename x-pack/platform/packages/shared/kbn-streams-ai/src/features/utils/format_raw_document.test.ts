/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { DEFAULT_INFERENCE_DOCUMENT_LIMITS, formatRawDocument } from './format_raw_document';

const hitWith = (
  source: Record<string, unknown>,
  id = 'doc-1'
): SearchHit<Record<string, unknown>> => ({
  _index: 'logs',
  _id: id,
  _source: source,
});

describe('formatRawDocument', () => {
  it('flattens _source and unwraps single-element arrays', () => {
    const document = formatRawDocument({
      hit: {
        _index: 'logs',
        _id: 'doc-1',
        _source: { nested: { field: 'value' } },
        fields: { 'scalar.field': ['only'] },
      } as SearchHit<Record<string, unknown>>,
    });

    expect(document).toEqual({
      _id: 'doc-1',
      fields: { 'scalar.field': 'only', 'nested.field': 'value' },
    });
  });

  it('returns undefined when there are no fields', () => {
    expect(formatRawDocument({ hit: hitWith({}) })).toBeUndefined();
  });

  it('truncates long strings with a trailing ellipsis', () => {
    const document = formatRawDocument({
      hit: hitWith({ message: 'x'.repeat(DEFAULT_INFERENCE_DOCUMENT_LIMITS.maxStringLength + 10) }),
    });

    expect(document?.fields.message).toBe(
      `${'x'.repeat(DEFAULT_INFERENCE_DOCUMENT_LIMITS.maxStringLength)}…`
    );
  });

  it('truncates arrays and keeps an accurate "+N more" marker', () => {
    const document = formatRawDocument({
      hit: hitWith({ codes: [1, 2, 3, 4, 5, 6] }),
      limits: { maxArrayItems: 3 },
    });

    expect(document?.fields.codes).toEqual([1, 2, 3, '+3 more']);
  });

  it('gives tag-like fields a larger array budget', () => {
    const tags = Array.from({ length: 120 }, (_, index) => `tag-${index}`);
    const document = formatRawDocument({ hit: hitWith({ tags }) });

    const formattedTags = document?.fields.tags as unknown[];
    expect(formattedTags).toHaveLength(DEFAULT_INFERENCE_DOCUMENT_LIMITS.maxTagItems + 1);
    expect(formattedTags[formattedTags.length - 1]).toBe(
      `+${120 - DEFAULT_INFERENCE_DOCUMENT_LIMITS.maxTagItems} more`
    );
  });

  it('elides nested objects beyond the max depth', () => {
    const document = formatRawDocument({
      hit: {
        _index: 'logs',
        _id: 'doc-1',
        fields: { deep: [{ a: { b: { c: { d: { e: { f: 'too deep' } } } } } }] },
      } as SearchHit<Record<string, unknown>>,
      limits: { maxNestedDepth: 3 },
    });

    expect(document?.fields.deep).toEqual({ a: { b: { c: '[nested value omitted]' } } });
  });

  it('drops fields whose name exceeds the max length', () => {
    const longKey = 'k'.repeat(DEFAULT_INFERENCE_DOCUMENT_LIMITS.maxFieldNameLength + 1);
    const document = formatRawDocument({ hit: hitWith({ [longKey]: 'value', message: 'kept' }) });

    expect(document?.fields).toEqual({ message: 'kept' });
  });

  it('keeps priority fields first when the byte budget is exhausted', () => {
    const document = formatRawDocument({
      hit: hitWith({
        noise: 'y'.repeat(900),
        message: 'the important log body',
      }),
      priorityFields: ['message'],
      limits: { maxDocumentBytes: 100 },
    });

    expect(document?.fields.message).toBe('the important log body');
    expect(document?.fields.noise).toBeUndefined();
  });

  it('prioritizes OTel-stored severity and service fields via prefix normalization', () => {
    const document = formatRawDocument({
      hit: hitWith({
        noise: 'y'.repeat(900),
        'resource.attributes.service.name': 'checkout',
        severity_text: 'ERROR',
      }),
      priorityFields: ['severity_text', 'service.name'],
      limits: { maxDocumentBytes: 160 },
    });

    expect(document?.fields['resource.attributes.service.name']).toBe('checkout');
    expect(document?.fields.severity_text).toBe('ERROR');
    expect(document?.fields.noise).toBeUndefined();
  });

  it('retains only one copy of equivalent log body and stack trace values', () => {
    const document = formatRawDocument({
      hit: hitWith({
        message: 'duplicate log body',
        'body.text': 'duplicate log body',
        'error.stack_trace': 'duplicate stack trace',
        'attributes.exception.stacktrace': 'duplicate stack trace',
      }),
      priorityFields: ['message', 'body.text', 'error.stack_trace', 'exception.stacktrace'],
    });

    expect(document?.fields).toEqual({
      message: 'duplicate log body',
      'error.stack_trace': 'duplicate stack trace',
    });
  });

  it('retains equivalent fields when their values differ', () => {
    const document = formatRawDocument({
      hit: hitWith({
        message: 'ECS log body',
        'body.text': 'OTel log body',
        'error.stack_trace': 'ECS stack trace',
        'exception.stacktrace': 'OTel stack trace',
      }),
    });

    expect(document?.fields).toEqual({
      message: 'ECS log body',
      'body.text': 'OTel log body',
      'error.stack_trace': 'ECS stack trace',
      'exception.stacktrace': 'OTel stack trace',
    });
  });

  it('caps the number of retained fields', () => {
    const document = formatRawDocument({
      hit: hitWith(
        Object.fromEntries(
          Array.from({ length: DEFAULT_INFERENCE_DOCUMENT_LIMITS.maxFields + 20 }, (_, index) => [
            `field-${index}`,
            'v',
          ])
        )
      ),
    });

    expect(Object.keys(document?.fields ?? {}).length).toBeLessThanOrEqual(
      DEFAULT_INFERENCE_DOCUMENT_LIMITS.maxFields
    );
  });
});
