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
import { getReadState, isReadAt, markRead, markAllRead } from './read_state';

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
  return { client, store };
};

const readOverride = (markedAt: string) => ({ read: true, markedAt });

describe('markRead', () => {
  it('records a read override for an unseen id', async () => {
    const { client, store } = createClient({
      overrides: { a: readOverride('2026-07-01T00:00:00.000Z') },
    });
    await markRead(client, 'b');

    const stored = store[OVERRIDES_KEY] as ReadOverrides;
    expect(Object.keys(stored)).toEqual(['a', 'b']);
    expect(stored.b.read).toBe(true);
    expect(Date.parse(stored.b.markedAt)).not.toBeNaN();
  });

  it('re-stamps markedAt for an id that is already read', async () => {
    const markedAt = '2026-07-01T00:00:00.000Z';
    const { client, store } = createClient({ overrides: { a: readOverride(markedAt) } });
    await markRead(client, 'a');

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
    const { client, store } = createClient({ overrides });
    await markRead(client, 'newest');

    const stored = store[OVERRIDES_KEY] as ReadOverrides;
    expect(Object.keys(stored)).toHaveLength(MAX_OVERRIDES);
    expect(stored['id-0']).toBeUndefined();
    expect(stored['id-1']).toBeDefined();
    expect(stored.newest.read).toBe(true);
  });
});

describe('markAllRead', () => {
  it('advances readAllBefore and clears the overrides', async () => {
    const { client, store } = createClient({
      overrides: { a: readOverride('2026-07-01T00:00:00.000Z') },
      readAllBefore: '1970-01-01T00:00:00.000Z',
    });
    const marker = await markAllRead(client);

    expect(store[READ_ALL_BEFORE_KEY]).toBe(marker);
    expect(Date.parse(marker)).not.toBeNaN();
    expect(store[OVERRIDES_KEY]).toEqual({});
  });

  it('writes the marker before clearing the overrides', async () => {
    const { client } = createClient({ overrides: { a: readOverride('2026-07-01T00:00:00.000Z') } });
    await markAllRead(client);

    const setKeys = (client.set as jest.Mock).mock.calls.map(([key]) => key);
    expect(setKeys).toEqual([READ_ALL_BEFORE_KEY, OVERRIDES_KEY]);
  });
});

describe('getReadState', () => {
  it('reads both keys for the scoped user', async () => {
    const { client } = createClient({
      overrides: { a: readOverride('2026-07-01T00:00:00.000Z') },
      readAllBefore: '2026-07-02T00:00:00.000Z',
    });

    await expect(getReadState(client, loggingSystemMock.createLogger())).resolves.toEqual({
      overrides: { a: readOverride('2026-07-01T00:00:00.000Z') },
      readAllBefore: '2026-07-02T00:00:00.000Z',
    });
  });

  it('stamps the catch-up marker on a first read', async () => {
    const { client, store } = createClient();

    const state = await getReadState(client, loggingSystemMock.createLogger());

    const stamped = store[READ_ALL_BEFORE_KEY] as string;
    expect(state?.readAllBefore).toBe(stamped);
    // The marker postdates the backlog, so what the user inherits reads as read
    expect(state && isReadAt(state, 'a', '2026-01-01T00:00:00.000Z')).toBe(true);
  });

  it('leaves an existing marker untouched', async () => {
    const { client } = createClient({ readAllBefore: '2026-07-02T00:00:00.000Z' });

    await getReadState(client, loggingSystemMock.createLogger());

    expect(client.set).not.toHaveBeenCalled();
  });

  it('degrades to an unannotated list when userStorage fails', async () => {
    const { client } = createClient();
    (client.get as jest.Mock).mockRejectedValue(new Error('boom'));
    const logger = loggingSystemMock.createLogger();

    await expect(getReadState(client, logger)).resolves.toBeUndefined();
    expect(logger.debug).toHaveBeenCalled();
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
