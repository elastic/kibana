/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUserStorageClient } from '@kbn/core-user-storage-common';
import {
  MAX_OVERRIDES,
  OVERRIDES_KEY,
  READ_ALL_BEFORE_KEY,
  type ReadOverrides,
} from '../storage/user_storage';
import { markRead, markAllRead } from './read_state';

const createClient = (initial: { overrides?: ReadOverrides; readAllBefore?: string } = {}) => {
  const store: Record<string, unknown> = {
    [OVERRIDES_KEY]: initial.overrides ?? {},
    ...(initial.readAllBefore ? { [READ_ALL_BEFORE_KEY]: initial.readAllBefore } : {}),
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

  it('is a no-op when the id is already read', async () => {
    const { client, store } = createClient({
      overrides: { a: readOverride('2026-07-01T00:00:00.000Z') },
    });
    await markRead(client, 'a');

    expect(store[OVERRIDES_KEY]).toEqual({ a: readOverride('2026-07-01T00:00:00.000Z') });
    expect(client.set).not.toHaveBeenCalled();
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
