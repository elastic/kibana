/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema } from '../config';
import { toMetadataResponse } from './metadata';

describe('toMetadataResponse', () => {
  it('merges declared parameters with placeholders found in the query', () => {
    const config = configSchema.validate({
      queries: [
        {
          id: 'by-host',
          title: 'By host',
          query: 'FROM logs | WHERE host.name == ?host AND bytes > ?min',
          params: [{ name: 'min', type: 'number', default: '0' }],
        },
      ],
    });

    expect(toMetadataResponse(config).queries).toEqual([
      {
        id: 'by-host',
        title: 'By host',
        description: undefined,
        query: 'FROM logs | WHERE host.name == ?host AND bytes > ?min',
        params: [
          { name: 'min', type: 'number', defaultValue: '0' },
          { name: 'host', type: 'string' },
        ],
      },
    ]);
  });
});

describe('configSchema', () => {
  it('rejects duplicate canned query ids', () => {
    expect(() =>
      configSchema.validate({
        queries: [
          { id: 'a', title: 'A', query: 'FROM a' },
          { id: 'a', title: 'B', query: 'FROM b' },
        ],
      })
    ).toThrow(/duplicate canned query id "a"/);
  });

  it('rejects canned query ids that are not URL-safe', () => {
    expect(() =>
      configSchema.validate({ queries: [{ id: 'a b', title: 'A', query: 'FROM a' }] })
    ).toThrow(/must only contain/);
  });
});
