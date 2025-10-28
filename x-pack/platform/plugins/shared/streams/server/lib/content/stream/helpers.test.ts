/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scopeIncludedObjects } from './helpers';

describe('content pack stream helpers', () => {
  it('scopes included objects to a parent', () => {
    const scoped = scopeIncludedObjects({
      root: 'logs.foo',
      include: {
        objects: {
          mappings: true,
          queries: [],
          routing: [
            {
              destination: 'bar',
              objects: { all: {} },
            },
            {
              destination: 'baz',
              objects: {
                mappings: true,
                queries: [],
                routing: [
                  {
                    destination: 'baz.foo',
                    objects: { all: {} },
                  },
                ],
              },
            },
          ],
        },
      },
    });

    expect(scoped).toEqual({
      objects: {
        mappings: true,
        queries: [],
        routing: [
          {
            destination: 'logs.foo.bar',
            objects: { all: {} },
          },
          {
            destination: 'logs.foo.baz',
            objects: {
              mappings: true,
              queries: [],
              routing: [
                {
                  destination: 'logs.foo.baz.foo',
                  objects: { all: {} },
                },
              ],
            },
          },
        ],
      },
    });
  });
});
