/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEvidenceGrounded } from './is_evidence_grounded';
import { matchesEvidenceText } from '../common/matches_evidence_text';

describe('matchesEvidenceText', () => {
  it('does not match short evidence as a substring inside a larger token', () => {
    expect(matchesEvidenceText('Request TARGET completed', 'GET')).toBe(false);
  });

  it('matches short evidence when it appears as its own token', () => {
    expect(matchesEvidenceText('GET /api/cart returned 200', 'GET')).toBe(true);
  });

  it('matches longer evidence as a substring after whitespace normalization', () => {
    expect(matchesEvidenceText('Error: connection refused\n  at main', 'connection refused')).toBe(
      true
    );
  });

  it('matches when evidence spans multiple lines and the value is on one line', () => {
    expect(
      matchesEvidenceText(
        'timeout connecting to upstream after 30s',
        'timeout\nconnecting   to\nupstream after 30s'
      )
    ).toBe(true);
  });
});

describe('isEvidenceGrounded', () => {
  it('grounds direct quotes against any string field in the documents', () => {
    const documents = [{ 'nested.message': 'payment timeout after 30s' }];
    expect(isEvidenceGrounded('payment timeout after 30s', documents)).toBe(true);
  });

  it('grounds single field evidence as field.path=value', () => {
    const documents = [{ 'http.status': 200, message: 'ok' }];
    expect(isEvidenceGrounded('http.status=200', documents)).toBe(true);
  });

  it('grounds single field evidence as field.path: value', () => {
    const documents = [{ 'http.status': 200, message: 'ok' }];
    expect(isEvidenceGrounded('http.status: 200', documents)).toBe(true);
  });

  it('grounds key=value when the value contains colons after the first equals', () => {
    const documents = [
      {
        'attributes.msg': 'user: 123 sent an order (id:123)',
      },
    ];
    expect(isEvidenceGrounded('attributes.msg=user: 123 sent an order (id:123)', documents)).toBe(
      true
    );
  });

  it('grounds combined key-value evidence when every pair matches the document', () => {
    const documents = [{ 'body.text': 'hello', 'http.status': 200 }];
    expect(isEvidenceGrounded('body.text=hello http.status=200', documents)).toBe(true);
  });

  it('grounds combined key-value evidence with colons when no equals pairs are present', () => {
    const documents = [{ 'body.text': 'hello', 'http.status': 200 }];
    expect(isEvidenceGrounded('body.text: hello http.status:200', documents)).toBe(true);
  });

  it('grounds key=value when the field path includes array index segments', () => {
    const documents = [
      {
        labels: [{ key: 'deployment.environment', value: 'production' }],
      },
    ];
    expect(isEvidenceGrounded('labels.0.key=deployment.environment', documents)).toBe(true);
  });

  it('returns false when evidence does not match the documents', () => {
    const documents = [{ message: 'nothing here' }];
    expect(isEvidenceGrounded('http.status=500', documents)).toBe(false);
  });
});
