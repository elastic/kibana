/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findStateReferences, hasMalformedReference, interpolate } from './interpolation';

describe('findStateReferences', () => {
  it('finds every referenced key, tolerating inner whitespace', () => {
    expect(findStateReferences('{{state.a}} and {{ state.b_2 }} and {{state.a}}')).toEqual([
      'a',
      'b_2',
      'a',
    ]);
  });

  it('finds nothing in plain text', () => {
    expect(findStateReferences('no references here')).toEqual([]);
  });
});

describe('hasMalformedReference', () => {
  it.each(['{{state}}', '{{state.a.b}}', '{{ other.a }}', '{{state.a', 'x {{ state.1a }}'])(
    'flags %s',
    (text) => {
      expect(hasMalformedReference(text)).toBe(true);
    }
  );

  it.each(['plain', '{{state.a}}', '{{ state.a }} and {{state.b}}', 'a } b { c'])(
    'accepts %s',
    (text) => {
      expect(hasMalformedReference(text)).toBe(false);
    }
  );
});

describe('interpolate', () => {
  it('inserts values as text', () => {
    expect(
      interpolate('Service {{state.service}}: {{state.count}} ({{state.on}})', {
        service: 'checkout',
        count: 3,
        on: true,
      })
    ).toBe('Service checkout: 3 (true)');
  });

  it('inserts nothing for a key without a value', () => {
    expect(interpolate('[{{state.missing}}]', {})).toBe('[]');
  });

  it('does not re-interpret markup or references inside a value', () => {
    expect(
      interpolate('{{state.a}}', { a: '<img src=x onerror=alert(1)> {{state.b}}', b: 'LEAK' })
    ).toBe('<img src=x onerror=alert(1)> {{state.b}}');
  });

  it('keeps replacement tokens in a value literal', () => {
    expect(interpolate('[{{state.a}}]', { a: "$& $1 $$ $'" })).toBe("[$& $1 $$ $']");
  });

  it('leaves text without references untouched', () => {
    expect(interpolate('plain $& text', { a: 'x' })).toBe('plain $& text');
  });
});
