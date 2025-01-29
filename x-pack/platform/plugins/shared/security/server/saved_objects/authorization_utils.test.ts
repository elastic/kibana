/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthorizationTypeMap } from '@kbn/core-saved-objects-server';

import { getEnsureAuthorizedActionResult, isAuthorizedInAllSpaces } from './authorization_utils';

describe('getEnsureAuthorizedActionResult', () => {
  const typeMap: AuthorizationTypeMap<'action'> = new Map([
    ['type', { action: { authorizedSpaces: ['space-id'] } }],
  ]);

  test('returns the appropriate result if it is in the typeMap', () => {
    const result = getEnsureAuthorizedActionResult('type', 'action', typeMap);
    expect(result).toEqual({ authorizedSpaces: ['space-id'] });
  });

  test('returns an unauthorized result if it is not in the typeMap', () => {
    const result = getEnsureAuthorizedActionResult('other-type', 'action', typeMap);
    expect(result).toEqual({ authorizedSpaces: [] });
  });
});

describe('isAuthorizedInAllSpaces', () => {
  const typeMap: AuthorizationTypeMap<'action'> = new Map([
    ['type-1', { action: { authorizedSpaces: [], isGloballyAuthorized: true } }],
    ['type-2', { action: { authorizedSpaces: ['space-1', 'space-2'] } }],
    ['type-3', { action: { authorizedSpaces: [] } }],
    // type-4 is not present in the results
  ]);

  test('returns true if the user is authorized for the type in the given spaces', () => {
    const type1Result = isAuthorizedInAllSpaces(
      'type-1',
      'action',
      ['space-1', 'space-2', 'space-3'],
      typeMap
    );
    expect(type1Result).toBe(true);

    // check for all authorized spaces
    const type2AllSpacesResult = isAuthorizedInAllSpaces(
      'type-2',
      'action',
      ['space-1', 'space-2'],
      typeMap
    );
    expect(type2AllSpacesResult).toBe(true);

    // check for subset of authorized spaces
    const type2Space2Result = isAuthorizedInAllSpaces('type-2', 'action', ['space-2'], typeMap);
    expect(type2Space2Result).toBe(true);
  });

  test('returns false if the user is not authorized for the type in the given spaces', () => {
    const type2Result = isAuthorizedInAllSpaces(
      'type-2',
      'action',
      [
        'space-1',
        'space-2',
        'space-3', // the user is not authorized for this type and action in space-3
      ],
      typeMap
    );
    expect(type2Result).toBe(false);

    const type3Result = isAuthorizedInAllSpaces(
      'type-3',
      'action',
      ['space-1'], // the user is not authorized for this type and action in any space
      typeMap
    );
    expect(type3Result).toBe(false);

    const type4Result = isAuthorizedInAllSpaces(
      'type-4',
      'action',
      ['space-1'], // the user is not authorized for this type and action in any space
      typeMap
    );
    expect(type4Result).toBe(false);
  });
});
