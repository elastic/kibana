/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { samplingFilterDslToKql } from './sampling_filter_dsl_to_kql';

describe('samplingFilterDslToKql', () => {
  it('translates supported leaf clauses', () => {
    expect(samplingFilterDslToKql({ match_all: {} })).toBe('*');
    expect(samplingFilterDslToKql({ term: { 'service.name': 'checkout' } })).toBe(
      'service.name: "checkout"'
    );
    expect(samplingFilterDslToKql({ term: { 'http.response.status_code': { value: 500 } } })).toBe(
      'http.response.status_code: 500'
    );
    expect(samplingFilterDslToKql({ match_phrase: { message: 'payment failed' } })).toBe(
      'message: "payment failed"'
    );
    expect(samplingFilterDslToKql({ match: { message: { query: 'timeout' } } })).toBe(
      'message: "timeout"'
    );
  });

  it('escapes quoted string values', () => {
    expect(samplingFilterDslToKql({ term: { message: 'failed "hard"' } })).toBe(
      'message: "failed \\"hard\\""'
    );
  });

  it('escapes backslashes before quotes so KQL parses the result correctly', () => {
    expect(samplingFilterDslToKql({ term: { message: 'foo\\"bar' } })).toBe(
      'message: "foo\\\\\\"bar"'
    );
    expect(samplingFilterDslToKql({ term: { path: 'C:\\\\logs\\\\app.log' } })).toBe(
      'path: "C:\\\\\\\\logs\\\\\\\\app.log"'
    );
  });

  it('translates exists clauses to KQL field-presence checks', () => {
    expect(
      samplingFilterDslToKql({ exists: { field: 'resource.attributes.k8s.pod.name' } })
    ).toBe('resource.attributes.k8s.pod.name: *');
    expect(
      samplingFilterDslToKql({
        bool: {
          filter: [{ exists: { field: 'service.name' } }],
          must_not: [{ exists: { field: 'error.message' } }],
        },
      })
    ).toBe('service.name: * AND NOT (error.message: *)');
  });

  it('translates bool clauses with array fields', () => {
    expect(
      samplingFilterDslToKql({
        bool: {
          filter: [{ term: { 'service.name': 'checkout' } }, { match: { message: 'error' } }],
          must_not: [{ term: { 'log.level': 'debug' } }],
          should: [{ term: { 'host.name': 'a' } }, { term: { 'host.name': 'b' } }],
        },
      })
    ).toBe(
      'service.name: "checkout" AND message: "error" AND NOT (log.level: "debug") AND (host.name: "a" OR host.name: "b")'
    );
  });

  it('translates bool clauses with single-object fields', () => {
    expect(
      samplingFilterDslToKql({
        bool: {
          filter: { term: { 'service.name': 'checkout' } },
          must: { match_phrase: { message: 'payment failed' } },
        },
      })
    ).toBe('service.name: "checkout" AND message: "payment failed"');
  });

  it('throws for unsupported clauses', () => {
    expect(() => samplingFilterDslToKql({ range: { '@timestamp': { gte: 0 } } })).toThrow(
      'samplingFilterDslToKql: unsupported DSL filter shape: {"range":{"@timestamp":{"gte":0}}}'
    );
  });

  it('throws when bool.minimum_should_match is greater than 1', () => {
    expect(() =>
      samplingFilterDslToKql({
        bool: {
          should: [
            { match_phrase: { 'body.text': 'a' } },
            { match_phrase: { 'body.text': 'b' } },
            { match_phrase: { 'body.text': 'c' } },
          ],
          minimum_should_match: 2,
        },
      })
    ).toThrow(/bool\.minimum_should_match > 1 is not supported \(got 2\)/);
  });
});
