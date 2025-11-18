/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { diffSOSecretPaths } from './common';

describe('diffSOSecretPaths', () => {
  const paths1 = [
    {
      path: 'somepath1',
      value: {
        id: 'secret-1',
      },
    },
    {
      path: 'somepath2',
      value: {
        id: 'secret-2',
      },
    },
  ];

  const paths2 = [
    paths1[0],
    {
      path: 'somepath2',
      value: 'newvalue',
    },
  ];

  it('should return empty array if no secrets', () => {
    expect(diffSOSecretPaths([], [])).toEqual({
      toCreate: [],
      toDelete: [],
      noChange: [],
    });
  });
  it('should return empty array if single secret not changed', () => {
    const paths = [
      {
        path: 'somepath',
        value: {
          id: 'secret-1',
        },
      },
    ];
    expect(diffSOSecretPaths(paths, paths)).toEqual({
      toCreate: [],
      toDelete: [],
      noChange: paths,
    });
  });
  it('should return empty array if multiple secrets not changed', () => {
    const paths = [
      {
        path: 'somepath',
        value: {
          id: 'secret-1',
        },
      },
      {
        path: 'somepath2',
        value: {
          id: 'secret-2',
        },
      },
      {
        path: 'somepath3',
        value: {
          id: 'secret-3',
        },
      },
    ];

    expect(diffSOSecretPaths(paths, paths.slice().reverse())).toEqual({
      toCreate: [],
      toDelete: [],
      noChange: paths,
    });
  });
  it('single secret modified', () => {
    expect(diffSOSecretPaths(paths1, paths2)).toEqual({
      toCreate: [
        {
          path: 'somepath2',
          value: 'newvalue',
        },
      ],
      toDelete: [
        {
          path: 'somepath2',
          value: {
            id: 'secret-2',
          },
        },
      ],
      noChange: [paths1[0]],
    });
  });
  it('double secret modified', () => {
    const pathsDouble1 = [
      {
        path: 'somepath1',
        value: {
          id: 'secret-1',
        },
      },
      {
        path: 'somepath2',
        value: {
          id: 'secret-2',
        },
      },
    ];

    const pathsDouble2 = [
      {
        path: 'somepath1',
        value: 'newvalue1',
      },
      {
        path: 'somepath2',
        value: 'newvalue2',
      },
    ];

    expect(diffSOSecretPaths(pathsDouble1, pathsDouble2)).toEqual({
      toCreate: [
        {
          path: 'somepath1',
          value: 'newvalue1',
        },
        {
          path: 'somepath2',
          value: 'newvalue2',
        },
      ],
      toDelete: [
        {
          path: 'somepath1',
          value: {
            id: 'secret-1',
          },
        },
        {
          path: 'somepath2',
          value: {
            id: 'secret-2',
          },
        },
      ],
      noChange: [],
    });
  });
  it('single secret added', () => {
    const pathsSingle1 = [
      {
        path: 'somepath1',
        value: {
          id: 'secret-1',
        },
      },
    ];

    const pathsSingle2 = [
      paths1[0],
      {
        path: 'somepath2',
        value: 'newvalue',
      },
    ];

    expect(diffSOSecretPaths(pathsSingle1, pathsSingle2)).toEqual({
      toCreate: [
        {
          path: 'somepath2',
          value: 'newvalue',
        },
      ],
      toDelete: [],
      noChange: [paths1[0]],
    });
  });
});
