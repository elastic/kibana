/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setSoClientInfo } from '../..';

import { createSavedObjectClientMock } from '../../mocks';

import { isSpaceAwarenessEnabled as _isSpaceAwarenessEnabled } from '../spaces/helpers';

import { calculateSavedObjectsNamespaces } from './calculate_saved_objects_namespaces';

jest.mock('../spaces/helpers', () => {
  const actualHelpers = jest.requireActual('../spaces/helpers');
  return {
    ...actualHelpers,
    isSpaceAwarenessEnabled: jest.fn(async () => true),
  };
});

const isSpaceAwarenessEnabledMock = _isSpaceAwarenessEnabled as jest.Mock;

describe('calculateSavedObjectsNamespaces()', () => {
  beforeEach(() => {
    isSpaceAwarenessEnabledMock.mockResolvedValue(true);
  });

  it('should return undefined when space awareness feature is disabled', async () => {
    isSpaceAwarenessEnabledMock.mockResolvedValue(false);

    await expect(
      calculateSavedObjectsNamespaces(createSavedObjectClientMock(), 'foo')
    ).resolves.toBe(undefined);
  });

  it.each`
    name                              | spaceIds
    ${'with single (string) spaceId'} | ${'foo'}
    ${'with array of spaceIds'}       | ${['foo', 'bar']}
  `('should return array with spaceIds that were provided on input', async ({ spaceIds }) => {
    await expect(
      calculateSavedObjectsNamespaces(createSavedObjectClientMock(), spaceIds)
    ).resolves.toEqual(Array.isArray(spaceIds) ? spaceIds : [spaceIds]);
  });

  it('should return undefined if un-scoped client was initialized for default space', async () => {
    const soClientMock = createSavedObjectClientMock();
    soClientMock.getCurrentNamespace.mockReturnValue(undefined);
    setSoClientInfo(soClientMock, { spaceId: 'default', isUnScoped: true });

    await expect(calculateSavedObjectsNamespaces(soClientMock)).resolves.toBe(undefined);
  });

  it('should return undefined when spaceId provided equals the namespace of the soClient', async () => {
    const soClientMock = createSavedObjectClientMock();
    soClientMock.getCurrentNamespace.mockReturnValue('foo');

    await expect(calculateSavedObjectsNamespaces(soClientMock, 'foo')).resolves.toEqual(undefined);
  });

  it('should return undefined when soClient is bound to a namespace and no spaceIds were provided on input', async () => {
    const soClientMock = createSavedObjectClientMock();
    soClientMock.getCurrentNamespace.mockReturnValue('foo');

    await expect(calculateSavedObjectsNamespaces(soClientMock, 'foo')).resolves.toEqual(undefined);
  });
});
