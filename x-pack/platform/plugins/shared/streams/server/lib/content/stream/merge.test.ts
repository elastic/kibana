/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamQuery } from '@kbn/streams-schema';
import { mergeQuery } from './merge';
import { PropertyConflict } from '@kbn/content-packs-schema';

describe('mergeQuery', () => {
  type Case = {
    name: string;
    base?: StreamQuery;
    existing?: StreamQuery;
    incoming?: StreamQuery;
    expectedValue?: StreamQuery;
    expectedConflict?: PropertyConflict;
  };

  const cases: Case[] = [
    // Base exists
    {
      name: 'Case 1: No changes anywhere',
      base: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
      existing: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
      incoming: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
      expectedValue: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
    },
    {
      name: 'Case 2: User didn’t change, incoming updated',
      base: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
      existing: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
      incoming: { id: 'foo', title: 'foo updated', kql: { query: 'message: hello' } },
      expectedValue: { id: 'foo', title: 'foo updated', kql: { query: 'message: hello' } },
    },
    {
      name: 'Case 3: User didn’t change, incoming deleted',
      base: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
      existing: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
    },
    {
      name: 'Case 4: User changed, incoming didn’t',
      base: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
      existing: { id: 'foo', title: 'foo updated', kql: { query: 'message: hello' } },
      incoming: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
      expectedValue: { id: 'foo', title: 'foo updated', kql: { query: 'message: hello' } },
    },
    {
      name: 'Case 5: Both changed to same defined value',
      base: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
      existing: { id: 'foo', title: 'foo updated', kql: { query: 'message: hello' } },
      incoming: { id: 'foo', title: 'foo updated', kql: { query: 'message: hello' } },
      expectedValue: { id: 'foo', title: 'foo updated', kql: { query: 'message: hello' } },
    },
    {
      name: 'Case 6: Both changed differently',
      base: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
      existing: { id: 'foo', title: 'foo updated user', kql: { query: 'message: hello' } },
      incoming: { id: 'foo', title: 'foo updated content pack', kql: { query: 'message: hello' } },
      expectedValue: { id: 'foo', title: 'foo updated user', kql: { query: 'message: hello' } },
      expectedConflict: {
        id: 'foo',
        type: 'query',
        value: {
          source: 'system',
          current: { id: 'foo', title: 'foo updated user', kql: { query: 'message: hello' } },
          incoming: {
            id: 'foo',
            title: 'foo updated content pack',
            kql: { query: 'message: hello' },
          },
        },
      },
    },
    {
      name: 'Case 7: User deleted, incoming deleted',
      base: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
    },
    {
      name: 'Case 8: User deleted, incoming unchanged',
      base: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
      incoming: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
    },
    {
      name: 'Case 9: User deleted, incoming changed',
      base: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
      incoming: { id: 'foo', title: 'foo updated', kql: { query: 'message: hello' } },
      expectedConflict: {
        id: 'foo',
        type: 'query',
        value: {
          source: 'system',
          current: undefined,
          incoming: {
            id: 'foo',
            title: 'foo updated',
            kql: { query: 'message: hello' },
          },
        },
      },
    },

    // Base missing
    {
      name: 'Case 10: Brand new install',
      base: undefined,
      existing: undefined,
      incoming: { id: 'foo', title: 'foo updated', kql: { query: 'message: hello' } },
      expectedValue: { id: 'foo', title: 'foo updated', kql: { query: 'message: hello' } },
    },
    {
      name: 'Case 11: User added, incoming deleted',
      existing: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
      expectedValue: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
    },
    {
      name: 'Case 12: Both added same value',
      existing: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
      incoming: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
      expectedValue: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
    },
    {
      name: 'Case 13: Both added different values',
      base: undefined,
      existing: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
      incoming: { id: 'foo', title: 'foo updated', kql: { query: 'message: hello' } },
      expectedValue: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
      expectedConflict: {
        id: 'foo',
        type: 'query',
        value: {
          source: 'system',
          current: { id: 'foo', title: 'foo', kql: { query: 'message: hello' } },
          incoming: { id: 'foo', title: 'foo updated', kql: { query: 'message: hello' } },
        },
      },
    },
  ];

  it.each(cases)('$name', ({ base, existing, incoming, expectedValue, expectedConflict }) => {
    const result = mergeQuery({
      base,
      existing,
      incoming,
      resolver: (existing) => ({ source: 'system', value: existing }),
    });
    expect(result).toEqual({ value: expectedValue, conflict: expectedConflict });
  });
});
