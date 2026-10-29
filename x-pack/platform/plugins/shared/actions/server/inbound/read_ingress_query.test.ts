/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_HANDSHAKE_CHALLENGE_LENGTH } from '@kbn/connector-specs';

import { readIngressQuery } from './read_ingress_query';

describe('readIngressQuery', () => {
  it('keeps bounded string parameters and omits the ingest token', () => {
    expect(
      readIngressQuery({
        token: 'ingest-secret',
        echo: 'opaque+/=',
        note: 'other',
      })
    ).toEqual({
      echo: 'opaque+/=',
      note: 'other',
    });
  });

  it('drops missing, empty, non-string, and over-cap entries', () => {
    expect(readIngressQuery({})).toEqual({});
    expect(
      readIngressQuery({
        '': 'present',
        echo: '',
        emptyKey: '',
        count: 1,
        list: ['a'],
        tooLong: 'x'.repeat(MAX_HANDSHAKE_CHALLENGE_LENGTH + 1),
        ['k'.repeat(129)]: 'value',
      })
    ).toEqual({});
  });

  it('keeps a value at the cap and stops after 16 keys', () => {
    const atCap = 'y'.repeat(MAX_HANDSHAKE_CHALLENGE_LENGTH);
    const query: Record<string, string> = { echo: atCap };
    for (let index = 0; index < 20; index++) {
      query[`k${index}`] = `v${index}`;
    }

    const result = readIngressQuery(query);

    expect(result.echo).toBe(atCap);
    expect(Object.keys(result)).toHaveLength(16);
    expect(result).not.toHaveProperty('k15');
  });
});
