/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstOfType, parseSavedObjectNdjson } from './ndjson';

describe('parseSavedObjectNdjson', () => {
  it('parses an NDJSON export and ignores the summary line', () => {
    const ndjson = [
      JSON.stringify({
        id: 'a',
        type: 'lens',
        attributes: { title: 'A' },
      }),
      JSON.stringify({
        id: 'b',
        type: 'dashboard',
        attributes: { title: 'B' },
      }),
      JSON.stringify({ exportedCount: 2, missingRefCount: 0 }),
      '',
    ].join('\n');

    const envelopes = parseSavedObjectNdjson(ndjson);
    expect(envelopes).toHaveLength(2);
    expect(firstOfType(envelopes, 'lens')?.id).toBe('a');
    expect(firstOfType(envelopes, 'dashboard')?.id).toBe('b');
  });

  it('tolerates malformed lines and empty input', () => {
    expect(parseSavedObjectNdjson('')).toEqual([]);
    expect(parseSavedObjectNdjson('not-json\n')).toEqual([]);
  });

  it('skips saved-object envelopes with invalid references', () => {
    const ndjson = JSON.stringify({
      id: 'a',
      type: 'lens',
      attributes: { title: 'A' },
      references: [{ id: 'data-view-1', type: 'index-pattern' }],
    });

    expect(parseSavedObjectNdjson(ndjson)).toEqual([]);
  });
});
