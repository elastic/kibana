/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUserStorageClient } from '@kbn/core-user-storage-common';
import { READ_ALL_BEFORE_KEY, READ_KEY } from '../storage/user_storage';
import { markRead, markAllRead } from './read_state';

const createClient = (initial: { read?: string[]; readAllBefore?: string } = {}) => {
  const store: Record<string, unknown> = {
    [READ_KEY]: initial.read ?? [],
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

describe('markRead', () => {
  it('appends an unseen id to the read list', async () => {
    const { client, store } = createClient({ read: ['a'] });
    await markRead(client, 'b');
    expect(store[READ_KEY]).toEqual(['a', 'b']);
  });

  it('is a no-op when the id is already read', async () => {
    const { client, store } = createClient({ read: ['a'] });
    await markRead(client, 'a');
    expect(store[READ_KEY]).toEqual(['a']);
    expect(client.set).not.toHaveBeenCalled();
  });
});

describe('markAllRead', () => {
  it('advances readAllBefore and clears the read list', async () => {
    const { client, store } = createClient({
      read: ['a', 'b'],
      readAllBefore: '1970-01-01T00:00:00.000Z',
    });
    const marker = await markAllRead(client);

    expect(store[READ_ALL_BEFORE_KEY]).toBe(marker);
    expect(Date.parse(marker)).not.toBeNaN();
    expect(store[READ_KEY]).toEqual([]);
  });

  it('writes the marker before clearing the list', async () => {
    const { client } = createClient({ read: ['a'] });
    await markAllRead(client);

    const setKeys = (client.set as jest.Mock).mock.calls.map(([key]) => key);
    expect(setKeys).toEqual([READ_ALL_BEFORE_KEY, READ_KEY]);
  });
});
