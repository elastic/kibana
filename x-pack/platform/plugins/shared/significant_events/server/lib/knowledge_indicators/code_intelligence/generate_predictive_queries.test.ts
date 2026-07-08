/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QUERY_TYPE_MATCH } from '@kbn/significant-events-schema';
import {
  buildPredictiveEsql,
  generatePredictiveQueries,
  isValidEsqlSyntax,
} from './generate_predictive_queries';
import type { LogSignature } from './types';

const signature = (overrides: Partial<LogSignature> = {}): LogSignature => ({
  level: 'error',
  severity: 70,
  message: 'Payment failed for order {}',
  staticPrefix: 'Payment failed for order',
  location: 'src/pay.go:42',
  ...overrides,
});

describe('buildPredictiveEsql', () => {
  it('matches the static prefix on a keyword message field with LIKE, with METADATA', () => {
    const esql = buildPredictiveEsql({
      samplingSource: 'logs.checkout',
      staticPrefix: 'Payment failed for order',
    });
    expect(esql).toContain('FROM logs.checkout METADATA _id, _source');
    expect(esql).toContain('message LIKE "*Payment failed for order*"');
    expect(esql).not.toContain('service.name');
    expect(isValidEsqlSyntax(esql)).toBe(true);
  });

  it('uses MATCH_PHRASE on a text message field (e.g. OTel body.text)', () => {
    const esql = buildPredictiveEsql({
      samplingSource: 'logs.otel',
      staticPrefix: 'Tracking ID Created',
      messageField: 'body.text',
      messageIsText: true,
    });
    expect(esql).toContain('MATCH_PHRASE(body.text, "Tracking ID Created")');
    expect(isValidEsqlSyntax(esql)).toBe(true);
  });

  it('neutralizes wildcards/quotes in the prefix and stays valid ES|QL', () => {
    const esql = buildPredictiveEsql({
      samplingSource: 'logs.checkout',
      staticPrefix: 'weird * "quoted"',
    });
    // Special chars are collapsed to spaces, so no raw wildcard/quote leaks in.
    expect(esql).toContain('message LIKE "*weird quoted*"');
    expect(isValidEsqlSyntax(esql)).toBe(true);
  });
});

describe('isValidEsqlSyntax', () => {
  it('rejects malformed ES|QL', () => {
    expect(isValidEsqlSyntax('THIS IS NOT ESQL |||')).toBe(false);
  });
});

describe('generatePredictiveQueries', () => {
  it('builds a durable draft match query per signature with code evidence', () => {
    const queries = generatePredictiveQueries({
      serviceName: 'checkoutservice',
      samplingSource: 'logs.checkout',
      signatures: [signature()],
      repository: 'acme/checkout',
      fingerprint: 'sha1',
    });
    expect(queries).toHaveLength(1);
    const [query] = queries;
    expect(query.type).toBe(QUERY_TYPE_MATCH);
    expect(query.severity_score).toBe(70);
    expect(query.title).toBe('Payment failed for order');
    expect(query.features).toEqual([{ id: 'service_name' }]);
    expect(query.evidence?.[0]).toContain('code: acme/checkout@sha1:src/pay.go:42');
    expect(query.id).toBeDefined();
  });

  it('de-duplicates queries that normalize to the same ES|QL', () => {
    const queries = generatePredictiveQueries({
      serviceName: 'checkoutservice',
      samplingSource: 'logs.checkout',
      signatures: [
        signature({ message: 'Payment failed for order {}' }),
        signature({ level: 'warn', severity: 50, message: 'Payment failed for order {}' }),
      ],
      repository: 'acme/checkout',
    });
    // Same static prefix -> same ES|QL -> de-duplicated to one.
    expect(queries).toHaveLength(1);
  });
});
