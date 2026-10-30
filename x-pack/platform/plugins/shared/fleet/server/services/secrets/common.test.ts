/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAppContextStartContractMock } from '../../mocks';
import { appContextService } from '../app_context';

import {
  collectCompiledSecretRefIds,
  diffSOSecretPaths,
  withClearedSecretReferences,
} from './common';

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

describe('collectCompiledSecretRefIds', () => {
  beforeEach(() => {
    appContextService.start(createAppContextStartContractMock());
  });

  it('returns an empty set when no placeholders are present', () => {
    const result = collectCompiledSecretRefIds({ inputs: [{ type: 'logfile' }] });
    expect(result).toEqual(new Set());
  });

  it('extracts a single id from a plain string value', () => {
    const result = collectCompiledSecretRefIds('$co.elastic.secret{my-id}');
    expect(result).toEqual(new Set(['my-id']));
  });

  it('extracts ids from an array of strings', () => {
    const result = collectCompiledSecretRefIds([
      '$co.elastic.secret{id-1}',
      '$co.elastic.secret{id-2}',
    ]);
    expect(result).toEqual(new Set(['id-1', 'id-2']));
  });

  it('extracts ids from deeply nested objects', () => {
    const result = collectCompiledSecretRefIds({
      a: { b: { password: '$co.elastic.secret{nested-id}' } },
    });
    expect(result).toEqual(new Set(['nested-id']));
  });

  it('deduplicates ids that appear more than once', () => {
    const result = collectCompiledSecretRefIds([
      '$co.elastic.secret{dup-id}',
      '$co.elastic.secret{dup-id}',
    ]);
    expect(result).toEqual(new Set(['dup-id']));
  });

  it('returns an empty set for undefined input', () => {
    const result = collectCompiledSecretRefIds(undefined);
    expect(result).toEqual(new Set());
  });

  it('returns undefined for an unserializable input (BigInt) and logs a warning', () => {
    const result = collectCompiledSecretRefIds(BigInt(1));
    expect(result).toBeUndefined();
  });
});

describe('withClearedSecretReferences', () => {
  it('sets a null at the path of a deleted secret, so the reference is removed', () => {
    expect(
      withClearedSecretReferences({ name: 'renamed' }, [
        { id: 'secret-1', path: 'secrets.ssl.key' },
      ])
    ).toEqual({ name: 'renamed', secrets: { ssl: { key: null } } });
  });

  it('clears every deleted secret', () => {
    expect(
      withClearedSecretReferences({}, [
        { id: 'secret-1', path: 'secrets.ssl.key' },
        { id: 'secret-2', path: 'secrets.service_token' },
      ])
    ).toEqual({ secrets: { ssl: { key: null }, service_token: null } });
  });

  it('keeps the new reference of a secret the update replaces', () => {
    expect(
      withClearedSecretReferences({ secrets: { ssl: { key: { id: 'secret-2' } } } }, [
        { id: 'secret-1', path: 'secrets.ssl.key' },
      ])
    ).toEqual({ secrets: { ssl: { key: { id: 'secret-2' } } } });
  });

  it('returns the object as it is when nothing is deleted', () => {
    const soObject = { name: 'renamed' };

    expect(withClearedSecretReferences(soObject, [])).toBe(soObject);
  });

  it('does not modify the object it is given', () => {
    const soObject = { name: 'renamed' };

    withClearedSecretReferences(soObject, [{ id: 'secret-1', path: 'secrets.ssl.key' }]);

    expect(soObject).toEqual({ name: 'renamed' });
  });
});
