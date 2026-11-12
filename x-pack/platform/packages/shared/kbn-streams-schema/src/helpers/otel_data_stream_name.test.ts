/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  composeOtelDataStreamName,
  parseOtelDataStreamName,
  validateOtelDataStreamIndex,
  validateOtelDataStreamName,
} from './otel_data_stream_name';

describe('composeOtelDataStreamName', () => {
  it('builds the otel data stream name from trimmed parts', () => {
    expect(
      composeOtelDataStreamName('metrics', { dataset: ' billing ', namespace: 'default ' })
    ).toBe('metrics-billing.otel-default');
  });
});

describe('parseOtelDataStreamName', () => {
  it.each([
    ['logs', 'logs-billing.otel-default', { dataset: 'billing', namespace: 'default' }],
    ['traces', 'traces-nginx.access.otel-prod', { dataset: 'nginx.access', namespace: 'prod' }],
    ['logs', 'logs-billing.otel.otel-default', { dataset: 'billing.otel', namespace: 'default' }],
    ['logs', 'logs-my-app.otel-default', { dataset: 'my-app', namespace: 'default' }],
    ['logs', 'logs-.otel-default', { dataset: '', namespace: 'default' }],
  ] as const)('%s %s', (signal, index, expected) => {
    expect(parseOtelDataStreamName(signal, index)).toEqual(expected);
  });

  it.each([
    ['logs', 'logs-billing-default'],
    ['logs', 'metrics-billing.otel-default'],
    ['metrics', 'metrics-billing.prometheus-default'],
    ['traces', 'billing.otel-default'],
    ['logs', 'accounting-2026'],
  ] as const)('%s %s does not parse', (signal, index) => {
    expect(parseOtelDataStreamName(signal, index)).toBeUndefined();
  });
});

describe('validateOtelDataStreamName', () => {
  it.each([
    [{ dataset: 'billing', namespace: 'default' }, undefined],
    [{ dataset: 'nginx.access', namespace: 'prod' }, undefined],
    [{ dataset: 'otel', namespace: 'default' }, undefined],
    [{ dataset: 'billing.otel', namespace: 'default' }, 'typeSuffix'],
    [{ dataset: 'node.prometheus', namespace: 'default' }, 'typeSuffix'],
    [{ dataset: ' ', namespace: 'default' }, 'datasetRequired'],
    [{ dataset: 'billing', namespace: ' ' }, 'namespaceRequired'],
    [{ dataset: '{{x}}', namespace: 'default' }, 'template'],
    [{ dataset: 'billing', namespace: '${env}' }, 'template'],
    [{ dataset: 'Billing', namespace: 'default' }, 'uppercase'],
    [{ dataset: 'my-app', namespace: 'default' }, 'hyphen'],
    [{ dataset: 'billing', namespace: 'eu-west' }, 'hyphen'],
    [{ dataset: 'bill*', namespace: 'default' }, 'invalidCharacter'],
    [{ dataset: 'billing', namespace: 'a b' }, 'invalidCharacter'],
    [{ dataset: 'bill\tng', namespace: 'default' }, 'invalidCharacter'],
    [{ dataset: 'bill\u200bing', namespace: 'default' }, 'invalidCharacter'],
    [{ dataset: 'billing', namespace: 'de\u00adfault' }, 'invalidCharacter'],
    [{ dataset: '..', namespace: 'default' }, 'invalidName'],
    [{ dataset: 'billing', namespace: '.' }, 'invalidName'],
    [{ dataset: 'a'.repeat(95), namespace: 'default' }, undefined],
    [{ dataset: 'a'.repeat(96), namespace: 'default' }, 'partTooLong'],
    [{ dataset: 'é'.repeat(47), namespace: 'default' }, undefined],
    [{ dataset: 'é'.repeat(48), namespace: 'default' }, 'partTooLong'],
    [{ dataset: 'billing', namespace: 'a'.repeat(100) }, undefined],
    [{ dataset: 'billing', namespace: 'a'.repeat(101) }, 'partTooLong'],
    [{ dataset: 'billing', namespace: 'é'.repeat(50) }, undefined],
    [{ dataset: 'billing', namespace: 'é'.repeat(51) }, 'partTooLong'],
  ])('%j -> %s', (name, expected) => {
    expect(validateOtelDataStreamName(name)).toBe(expected);
  });
});

describe('validateOtelDataStreamIndex', () => {
  it.each([
    ['logs', 'logs-billing.otel-default', undefined],
    ['metrics', 'metrics-billing.otel-default', undefined],
    ['traces', 'traces-billing.otel-default', undefined],
    ['logs', 'logs-billing-default', 'shape'],
    ['metrics', 'metrics-billing.prometheus-default', 'shape'],
    ['metrics', 'logs-billing.otel-default', 'shape'],
    ['logs', 'shared-idx', 'shape'],
    ['logs', 'logs-my-app.otel-default', 'hyphen'],
    ['logs', 'logs-billing.otel-prod-eu', 'hyphen'],
    ['logs', 'logs-Billing.otel-default', 'uppercase'],
    ['logs', 'logs-.otel-default', 'datasetRequired'],
    ['logs', 'logs-billing.otel-', 'namespaceRequired'],
    ['logs', 'logs-billing.otel.otel-default', 'typeSuffix'],
  ] as const)('%s %s -> %s', (signal, index, expected) => {
    expect(validateOtelDataStreamIndex(signal, index)).toBe(expected);
  });
});
