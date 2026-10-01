/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSmlOriginId,
  getSmlOriginUri,
  smlEntryId,
  smlEntryIdFromOriginUri,
  smlOriginUriFromEntryId,
} from './sml_origin';

const docWithOriginUri = (uri: string) => ({
  references: [{ uri: 'category://sales' }, { uri, relation: 'derived_from' as const }],
});

describe('getSmlOriginUri', () => {
  it('returns the derived_from reference', () => {
    expect(getSmlOriginUri(docWithOriginUri('dashboard://dash-1'))).toBe('dashboard://dash-1');
  });

  it('returns an empty string without a derived_from reference', () => {
    expect(getSmlOriginUri({ references: [{ uri: 'category://sales' }] })).toBe('');
  });
});

describe('getSmlOriginId', () => {
  it('returns the part after the type scheme', () => {
    expect(getSmlOriginId(docWithOriginUri('dashboard://dash-1'))).toBe('dash-1');
  });

  it('keeps an origin id that itself contains the separator', () => {
    expect(getSmlOriginId(docWithOriginUri('workflow://https://example.com/wf'))).toBe(
      'https://example.com/wf'
    );
  });

  it('keeps an origin id containing colons and slashes', () => {
    expect(getSmlOriginId(docWithOriginUri('esql://my-query:v2/step1'))).toBe('my-query:v2/step1');
  });

  it('returns an empty string for a uri without a scheme', () => {
    expect(getSmlOriginId(docWithOriginUri('dash-1'))).toBe('');
  });

  it('returns an empty string for a uri with a scheme but no id', () => {
    expect(getSmlOriginId(docWithOriginUri('dashboard://'))).toBe('');
  });

  it('returns an empty string for an empty uri', () => {
    expect(getSmlOriginId(docWithOriginUri(''))).toBe('');
  });
});

describe('entry ids', () => {
  it('derives the entry id from type and origin id', () => {
    expect(smlEntryId('dashboard', 'dash-1')).toBe('dashboard:dash-1');
  });

  it('round-trips between origin uri and entry id', () => {
    expect(smlEntryIdFromOriginUri('esql://my-query:v2/step1')).toBe('esql:my-query:v2/step1');
    expect(smlOriginUriFromEntryId('esql:my-query:v2/step1')).toBe('esql://my-query:v2/step1');
  });
});
