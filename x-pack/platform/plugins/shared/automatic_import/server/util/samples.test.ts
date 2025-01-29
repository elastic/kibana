/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenObjectsList, merge } from './samples';

describe('flattenObjectsList', () => {
  it('Should return a list with flattened key/value entries', async () => {
    const result = flattenObjectsList([
      {
        name: 'a',
        type: 'group',
        fields: [
          {
            name: 'b',
            type: 'keyword',
            description: 'Some description for b',
          },
          {
            name: 'c',
            type: 'group',
            fields: [
              {
                name: 'd',
                type: 'keyword',
              },
              {
                name: 'e',
                description: 'Some description for e',
                type: 'keyword',
              },
            ],
          },
        ],
      },
    ]);

    expect(result).toEqual([
      {
        name: 'a.b',
        type: 'keyword',
        description: 'Some description for b',
      },
      {
        name: 'a.c.d',
        type: 'keyword',
        description: undefined,
      },
      {
        name: 'a.c.e',
        type: 'keyword',
        description: 'Some description for e',
      },
    ]);
  });

  it('Should return an empty list if passed an empty list', async () => {
    const result = flattenObjectsList([]);

    expect(result).toEqual([]);
  });

  it('Should return a list with key/value entries', async () => {
    const result = flattenObjectsList([
      {
        name: 'a',
        type: 'keyword',
        description: 'Some description for a',
      },
    ]);

    expect(result).toEqual([
      {
        name: 'a',
        type: 'keyword',
        description: 'Some description for a',
      },
    ]);
  });

  it('Should return an sorted list of key/value entries', async () => {
    const result = flattenObjectsList([
      {
        name: 'c',
        type: 'group',
        fields: [
          {
            name: 'b',
            type: 'keyword',
            description: 'Some description for b',
          },
          {
            name: 'a',
            type: 'group',
            fields: [
              {
                name: 'e',
                type: 'keyword',
                description: 'Some description for e',
              },
              {
                name: 'd',
                type: 'keyword',
              },
            ],
          },
        ],
      },
    ]);

    expect(result).toEqual([
      {
        name: 'c.a.d',
        type: 'keyword',
        description: undefined,
      },
      {
        name: 'c.a.e',
        type: 'keyword',
        description: 'Some description for e',
      },
      {
        name: 'c.b',
        type: 'keyword',
        description: 'Some description for b',
      },
    ]);
  });

  it('Should not error if group type is not an array', async () => {
    const result = flattenObjectsList([
      {
        name: 'a',
        type: 'group',
        fields: [
          {
            name: 'b',
            type: 'keyword',
            description: 'Some description for b',
          },
          {
            name: 'c',
            type: 'group',
          },
        ],
      },
    ]);

    expect(result).toEqual([
      {
        name: 'a.b',
        type: 'keyword',
        description: 'Some description for b',
      },
      {
        name: 'a.c',
        type: 'group',
        description: undefined,
      },
    ]);
  });
});

describe('merge', () => {
  it('Should return source if target is empty', async () => {
    const target = {};
    const source = { target: 'user.name', confidence: 0.9, type: 'string', date_formats: [] };

    const result = merge(target, source);

    expect(result).toEqual(source);
  });

  it('Should return target if source is empty', async () => {
    const target = { hostname: '0.0.0.0', 'teleport.internal/resource-id': '1234' };
    const source = {};

    const result = merge(target, source);

    expect(result).toEqual(target);
  });

  it('Should return one result', async () => {
    const target = {
      aaa: {
        ei: 0,
        event: 'cert.create',
        uid: '1234',
        cluster_name: 'cluster.com',
        identity: { user: 'teleport-admin' },
        server_labels: { hostname: 'some-hostname' },
      },
    };
    const source = {
      aaa: {
        ei: 0,
        event: 'session.start',
        uid: '4567',
        cluster_name: 'cluster.com',
        user: 'teleport-admin',
        server_labels: { hostname: 'some-other-hostname', id: '1234' },
      },
    };

    const result = merge(target, source);

    expect(result).toEqual({
      aaa: {
        ei: 0,
        event: 'cert.create',
        uid: '1234',
        cluster_name: 'cluster.com',
        identity: { user: 'teleport-admin' },
        server_labels: { hostname: 'some-hostname', id: '1234' },
        user: 'teleport-admin',
      },
    });
  });

  it('Should not merge built-in properties of neither target nor source', async () => {
    const target = {
      __proto__: 'some properties',
      constructor: 'some other properties',
      hostname: '0.0.0.0',
      'teleport.internal/resource-id': '1234',
    };
    const source = {
      __proto__: 'some properties of source',
      constructor: 'some other properties of source',
    };

    const result = merge(target, source);

    expect(result).toEqual({ hostname: '0.0.0.0', 'teleport.internal/resource-id': '1234' });
  });

  it('Should keep source object if it collides with target key that is not an object', async () => {
    const target = {
      hostname: '',
      'teleport.internal/resource-id': '1234',
      date_formats: 'format',
    };
    const source = {
      target: 'user.name',
      confidence: 0.9,
      type: 'string',
      date_formats: { key: 'value' },
    };

    const result = merge(target, source);

    expect(result).toEqual({
      'teleport.internal/resource-id': '1234',
      target: 'user.name',
      confidence: 0.9,
      type: 'string',
      hostname: '',
      date_formats: { key: 'value' },
    });
  });

  it('Should copy array into the result', async () => {
    const target = { date_formats: ['a', 'b'] };
    const source = { target: 'user.name', confidence: 0.9, type: 'string', date_formats: ['c'] };

    const result = merge(target, source);

    expect(result).toEqual(source);
  });
});
