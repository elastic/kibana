/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mergeProjection } from './index';

describe('mergeProjection', () => {
  it('overrides arrays', () => {
    expect(
      mergeProjection(
        { body: { query: { bool: { must: [{ terms: ['a'] }] } } } },
        { body: { query: { bool: { must: [{ term: 'b' }] } } } }
      )
    ).toEqual({
      body: {
        query: {
          bool: {
            must: [
              {
                term: 'b'
              }
            ]
          }
        }
      }
    });
  });

  it('merges plain objects', () => {
    expect(
      mergeProjection(
        { body: { query: {}, aggs: { foo: { terms: { field: 'bar' } } } } },
        {
          body: {
            aggs: { foo: { aggs: { bar: { terms: { field: 'baz' } } } } }
          }
        }
      )
    ).toEqual({
      body: {
        query: {},
        aggs: {
          foo: {
            terms: {
              field: 'bar'
            },
            aggs: {
              bar: {
                terms: {
                  field: 'baz'
                }
              }
            }
          }
        }
      }
    });
  });
});
