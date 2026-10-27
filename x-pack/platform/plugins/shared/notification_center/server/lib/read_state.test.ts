/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { IUserStorageClient } from '@kbn/core-user-storage-common';
import {
  MAX_OVERRIDES,
  OVERRIDES_KEY,
  READ_ALL_BEFORE_DEFAULT,
  READ_ALL_BEFORE_KEY,
  type ReadOverrides,
} from '../storage/user_storage';
import { isReadAt, ReadStateService } from './read_state';
import { UserProfileRequiredError } from './user_profile_required_error';

const createClient = (initial: { overrides?: ReadOverrides; readAllBefore?: string } = {}) => {
  const store: Record<string, unknown> = {
    [OVERRIDES_KEY]: initial.overrides ?? {},
    [READ_ALL_BEFORE_KEY]: initial.readAllBefore ?? READ_ALL_BEFORE_DEFAULT,
  };
  const client: IUserStorageClient = {
    get: jest.fn(async (key: string) => store[key]),
    set: jest.fn(async (key: string, value: unknown) => {
      store[key] = value;
      return value;
    }),
    remove: jest.fn(),
    getForInjection: jest.fn(),
  } as unknown as IUserStorageClient;
  const logger = loggingSystemMock.createLogger();
  return { client, store, logger, service: new ReadStateService(client, logger) };
};

const readOverride = (markedAt: string) => ({ read: true, markedAt });

describe('markRead', () => {
  it('records a read override for an unseen id', async () => {
    const { store, service } = createClient({
      overrides: { a: readOverride('2026-07-01T00:00:00.000Z') },
    });
    await service.markRead('b');

    const stored = store[OVERRIDES_KEY] as ReadOverrides;
    expect(Object.keys(stored)).toEqual(['a', 'b']);
    expect(stored.b.read).toBe(true);
    expect(Date.parse(stored.b.markedAt)).not.toBeNaN();
  });

  it('re-stamps markedAt for an id that is already read', async () => {
    const markedAt = '2026-07-01T00:00:00.000Z';
    const { store, service } = createClient({ overrides: { a: readOverride(markedAt) } });
    await service.markRead('a');

    // The override anchors on the copy in hand, so re-marking has to move the anchor forward or
    // an id re-pushed since the last mark can never be read again.
    const stored = store[OVERRIDES_KEY] as ReadOverrides;
    expect(stored.a.read).toBe(true);
    expect(Date.parse(stored.a.markedAt)).toBeGreaterThan(Date.parse(markedAt));
  });

  it('caps overrides at MAX_OVERRIDES, dropping the oldest by markedAt', async () => {
    const base = Date.parse('2020-01-01T00:00:00.000Z');
    const overrides: ReadOverrides = Object.fromEntries(
      Array.from({ length: MAX_OVERRIDES }, (_, i) => [
        `id-${i}`,
        readOverride(new Date(base + i * 1000).toISOString()),
      ])
    );
    const { store, service } = createClient({ overrides });
    await service.markRead('newest');

    const stored = store[OVERRIDES_KEY] as ReadOverrides;
    expect(Object.keys(stored)).toHaveLength(MAX_OVERRIDES);
    expect(stored['id-0']).toBeUndefined();
    expect(stored['id-1']).toBeDefined();
    expect(stored.newest.read).toBe(true);
  });
});

describe('markAllRead', () => {
  it('advances readAllBefore and clears the overrides', async () => {
    const { store, service } = createClient({
      overrides: { a: readOverride('2026-07-01T00:00:00.000Z') },
      readAllBefore: '1970-01-01T00:00:00.000Z',
    });
    const marker = await service.markAllRead();

    expect(store[READ_ALL_BEFORE_KEY]).toBe(marker);
    expect(Date.parse(marker)).not.toBeNaN();
    expect(store[OVERRIDES_KEY]).toEqual({});
  });

  it('writes the marker before clearing the overrides', async () => {
    const { client, service } = createClient({
      overrides: { a: readOverride('2026-07-01T00:00:00.000Z') },
    });
    await service.markAllRead();

    const setKeys = (client.set as jest.Mock).mock.calls.map(([key]) => key);
    expect(setKeys).toEqual([READ_ALL_BEFORE_KEY, OVERRIDES_KEY]);
  });
});

describe('ReadStateService.get', () => {
  it('reads both keys for the scoped user', async () => {
    const { service } = createClient({
      overrides: { a: readOverride('2026-07-01T00:00:00.000Z') },
      readAllBefore: '2026-07-02T00:00:00.000Z',
    });

    await expect(service.get()).resolves.toEqual({
      overrides: { a: readOverride('2026-07-01T00:00:00.000Z') },
      readAllBefore: '2026-07-02T00:00:00.000Z',
    });
  });

  it('stamps the catch-up marker on a first read', async () => {
    const { store, service } = createClient();

    const state = await service.get();

    const stamped = store[READ_ALL_BEFORE_KEY] as string;
    expect(state?.readAllBefore).toBe(stamped);
    // The marker postdates the backlog, so what the user inherits reads as read
    expect(state && isReadAt(state, 'a', '2026-01-01T00:00:00.000Z')).toBe(true);
  });

  it('leaves an existing marker untouched', async () => {
    const { client, service } = createClient({ readAllBefore: '2026-07-02T00:00:00.000Z' });

    await service.get();

    expect(client.set).not.toHaveBeenCalled();
  });

  it('degrades to an unannotated list when userStorage fails', async () => {
    const { client, logger, service } = createClient();
    (client.get as jest.Mock).mockRejectedValue(new Error('boom'));

    await expect(service.get()).resolves.toBeUndefined();
    expect(logger.debug).toHaveBeenCalled();
  });
});

describe('ReadStateService without a user profile', () => {
  const createAnonymous = () => new ReadStateService(null, loggingSystemMock.createLogger());

  it('reports no user profile and reads no state', async () => {
    const service = createAnonymous();

    expect(service.hasUserProfile).toBe(false);
    await expect(service.get()).resolves.toBeUndefined();
  });

  it('rejects writes rather than silently dropping them', async () => {
    const service = createAnonymous();

    await expect(service.markRead('a')).rejects.toThrow(UserProfileRequiredError);
    await expect(service.markAllRead()).rejects.toThrow(UserProfileRequiredError);
  });
});

describe('isReadAt', () => {
  const at = (copy: string, state: Parameters<typeof isReadAt>[0]) => isReadAt(state, 'a', copy);

  it('reads copies at or before readAllBefore when the id has no override', () => {
    const state = { overrides: {}, readAllBefore: '2026-07-15T00:00:00.000Z' };

    expect(at('2026-07-15T00:00:00.000Z', state)).toBe(true);
    expect(at('2026-07-14T00:00:00.000Z', state)).toBe(true);
    // A copy pushed after the bulk catch-up is new activity, so it resurfaces as unread
    expect(at('2026-07-16T00:00:00.000Z', state)).toBe(false);
  });

  it('prefers a read override over the marker, anchored on when it was recorded', () => {
    const state = {
      overrides: { a: readOverride('2026-07-10T00:00:00.000Z') },
      readAllBefore: '2026-01-01T00:00:00.000Z',
    };

    expect(at('2026-07-09T00:00:00.000Z', state)).toBe(true);
    // Marking a notification read acknowledges the copy in hand, not every future one
    expect(at('2026-07-11T00:00:00.000Z', state)).toBe(false);
  });

  it('keeps an unread override unread regardless of the copy', () => {
    const state = {
      overrides: { a: { read: false, markedAt: '2026-07-10T00:00:00.000Z' } },
      readAllBefore: '2026-07-20T00:00:00.000Z',
    };

    expect(at('2026-07-09T00:00:00.000Z', state)).toBe(false);
    expect(at('2026-07-21T00:00:00.000Z', state)).toBe(false);
  });
});
