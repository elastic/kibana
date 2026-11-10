/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { UnitApiKey } from './unit_api_keys';
import {
  invalidateUnitApiKeys,
  isApiKeyOfRemovedComponent,
  PENDING_API_KEY_GRACE_PERIOD_MS,
} from './unit_api_keys';

const apiKey = (componentType: UnitApiKey['component_type'], componentId: string): UnitApiKey => ({
  key_id: `${componentType}-${componentId}`,
  component_type: componentType,
  component_id: componentId,
  created_at: '2026-11-03T00:00:00.000Z',
});

describe('isApiKeyOfRemovedComponent', () => {
  const keyCreatedAt = Date.parse('2026-11-03T00:00:00.000Z');
  const isRemoved = isApiKeyOfRemovedComponent(
    {
      sources: [{ id: 'kept' }],
      destinations: [
        { id: 'kept-dest', type: 'elasticsearch' },
        { id: 'now-remote', type: 'remote_elasticsearch' },
        { id: 'now-s3', type: 's3' },
      ],
    },
    { now: keyCreatedAt + PENDING_API_KEY_GRACE_PERIOD_MS }
  );

  it('selects keys whose component is no longer on the unit', () => {
    expect(isRemoved(apiKey('source', 'gone'))).toBe(true);
    expect(isRemoved(apiKey('destination', 'gone'))).toBe(true);
  });

  it('keeps keys of components that are still on the unit', () => {
    expect(isRemoved(apiKey('source', 'kept'))).toBe(false);
    expect(isRemoved(apiKey('destination', 'kept-dest'))).toBe(false);
  });

  it('matches on the component type as well as the id', () => {
    expect(isRemoved(apiKey('destination', 'kept'))).toBe(true);
  });

  it('selects the key of a destination that kept its id but is no longer local Elasticsearch', () => {
    expect(isRemoved(apiKey('destination', 'now-remote'))).toBe(true);
    expect(isRemoved(apiKey('destination', 'now-s3'))).toBe(true);
  });

  describe('within the grace period', () => {
    const now = keyCreatedAt + PENDING_API_KEY_GRACE_PERIOD_MS - 1;

    it('keeps a key whose component was never saved, as a concurrent save may be adding it', () => {
      const isRemovedNow = isApiKeyOfRemovedComponent({ destinations: [] }, { now });
      expect(isRemovedNow(apiKey('destination', 'pending'))).toBe(false);
    });

    it('selects a key whose component was on the previous unit', () => {
      const isRemovedNow = isApiKeyOfRemovedComponent(
        { destinations: [] },
        { previousUnit: { destinations: [{ id: 'gone', type: 'elasticsearch' }] }, now }
      );
      expect(isRemovedNow(apiKey('destination', 'gone'))).toBe(true);
    });
  });
});

describe('invalidateUnitApiKeys', () => {
  const logger = loggerMock.create();

  it('does not call Elasticsearch without ids', async () => {
    const invalidate = jest.fn();

    await expect(invalidateUnitApiKeys({ ids: [], invalidate, logger })).resolves.toEqual({
      revokedIds: [],
      apiKeysMayRemain: false,
    });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('treats every id as revoked when invalidation reports no errors', async () => {
    const invalidate = jest.fn().mockResolvedValue({
      invalidated_api_keys: ['a'],
      previously_invalidated_api_keys: [],
      error_count: 0,
    });

    await expect(invalidateUnitApiKeys({ ids: ['a', 'b'], invalidate, logger })).resolves.toEqual({
      revokedIds: ['a', 'b'],
      apiKeysMayRemain: false,
    });
  });

  it('treats every id as revoked when security is disabled', async () => {
    const invalidate = jest.fn().mockResolvedValue(null);

    await expect(invalidateUnitApiKeys({ ids: ['a'], invalidate, logger })).resolves.toEqual({
      revokedIds: ['a'],
      apiKeysMayRemain: false,
    });
  });

  it('reports only confirmed ids when some invalidations fail', async () => {
    const invalidate = jest.fn().mockResolvedValue({
      invalidated_api_keys: ['a'],
      previously_invalidated_api_keys: ['b'],
      error_count: 1,
    });

    await expect(
      invalidateUnitApiKeys({ ids: ['a', 'b', 'c'], invalidate, logger })
    ).resolves.toEqual({ revokedIds: ['a', 'b'], apiKeysMayRemain: true });
  });

  it('reports that keys may remain when the request fails', async () => {
    const invalidate = jest.fn().mockRejectedValue(new Error('boom'));

    await expect(invalidateUnitApiKeys({ ids: ['a'], invalidate, logger })).resolves.toEqual({
      revokedIds: [],
      apiKeysMayRemain: true,
    });
  });
});
