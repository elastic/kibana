/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { CASE_LAST_VIEWED_SAVED_OBJECT } from '../../../common/constants';
import { LastViewedService } from '.';
import { SESSION_GAP_MS } from './state';

describe('LastViewedService', () => {
  const now = new Date('2026-11-20T10:00:00.000Z');
  const userKey = 'u_sam';
  const key = 'cases:case-1';

  const setup = () => {
    const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
    const service = new LastViewedService({
      log: loggingSystemMock.createLogger(),
      unsecuredSavedObjectsClient,
    });
    return { unsecuredSavedObjectsClient, service };
  };

  const existing = (viewedAt: string, seenAt: string | null) => ({
    id: userKey,
    type: CASE_LAST_VIEWED_SAVED_OBJECT,
    references: [],
    attributes: { entries: [{ key, viewedAt, seenAt }] },
  });

  describe('getSeenAt', () => {
    it('returns null when the user has no document', async () => {
      const { unsecuredSavedObjectsClient, service } = setup();
      unsecuredSavedObjectsClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(CASE_LAST_VIEWED_SAVED_OBJECT, userKey)
      );

      await expect(service.getSeenAt({ userKey, key })).resolves.toBeNull();
    });

    it('returns the window start of the entry', async () => {
      const { unsecuredSavedObjectsClient, service } = setup();
      unsecuredSavedObjectsClient.get.mockResolvedValue(
        existing('2026-11-20T09:00:00.000Z', '2026-11-19T09:00:00.000Z')
      );

      await expect(service.getSeenAt({ userKey, key })).resolves.toBe('2026-11-19T09:00:00.000Z');
    });

    it('throws errors other than not found', async () => {
      const { unsecuredSavedObjectsClient, service } = setup();
      unsecuredSavedObjectsClient.get.mockRejectedValue(new Error('boom'));

      await expect(service.getSeenAt({ userKey, key })).rejects.toThrow('boom');
    });
  });

  describe('record', () => {
    it('creates the document on the first visit', async () => {
      const { unsecuredSavedObjectsClient, service } = setup();
      unsecuredSavedObjectsClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(CASE_LAST_VIEWED_SAVED_OBJECT, userKey)
      );

      const seenAt = await service.record({ userKey, key, now });

      expect(seenAt).toBeNull();
      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
        CASE_LAST_VIEWED_SAVED_OBJECT,
        { entries: [{ key, viewedAt: now.toISOString(), seenAt: null }] },
        { id: userKey, overwrite: true }
      );
    });

    it('returns the previous visit as the window start after the session gap', async () => {
      const { unsecuredSavedObjectsClient, service } = setup();
      const previousVisit = new Date(now.getTime() - SESSION_GAP_MS - 1).toISOString();
      unsecuredSavedObjectsClient.get.mockResolvedValue(existing(previousVisit, null));

      await expect(service.record({ userKey, key, now })).resolves.toBe(previousVisit);
    });

    it('does not write for a repeat visit inside the throttle window', async () => {
      const { unsecuredSavedObjectsClient, service } = setup();
      unsecuredSavedObjectsClient.get.mockResolvedValue(
        existing(new Date(now.getTime() - 1000).toISOString(), null)
      );

      await service.record({ userKey, key, now });

      expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
    });

    it('moves the window start to now when the user marks the case as seen', async () => {
      const { unsecuredSavedObjectsClient, service } = setup();
      unsecuredSavedObjectsClient.get.mockResolvedValue(
        existing(new Date(now.getTime() - 1000).toISOString(), null)
      );

      await expect(service.record({ userKey, key, now, markSeen: true })).resolves.toBe(
        now.toISOString()
      );
    });
  });
});
