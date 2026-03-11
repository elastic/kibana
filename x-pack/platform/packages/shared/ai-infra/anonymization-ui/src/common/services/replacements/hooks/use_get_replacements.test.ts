/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useGetReplacements } from './use_get_replacements';

jest.mock('@kbn/react-query', () => ({
  useQuery: jest.fn(),
}));

describe('useGetReplacements', () => {
  const getReplacements = jest.fn();
  const client = { getReplacements };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useQuery).mockImplementation((params: unknown) => params as never);
  });

  it('returns null from queryFn when replacementsId is not provided', async () => {
    const query = useGetReplacements({ client, replacementsId: undefined, enabled: true }) as {
      queryFn: () => Promise<unknown>;
    };

    await expect(query.queryFn()).resolves.toBeNull();
    expect(getReplacements).not.toHaveBeenCalled();
  });

  it('returns replacements when client call succeeds', async () => {
    const replacements = { id: 'rep-1', namespace: 'default', replacements: [] };
    getReplacements.mockResolvedValue(replacements);

    const query = useGetReplacements({ client, replacementsId: 'rep-1', enabled: true }) as {
      queryFn: () => Promise<unknown>;
    };

    await expect(query.queryFn()).resolves.toEqual(replacements);
    expect(getReplacements).toHaveBeenCalledWith('rep-1');
  });

  it('returns null for not_found errors', async () => {
    getReplacements.mockRejectedValue({ kind: 'not_found' });

    const query = useGetReplacements({ client, replacementsId: 'rep-404', enabled: true }) as {
      queryFn: () => Promise<unknown>;
    };

    await expect(query.queryFn()).resolves.toBeNull();
  });

  it('rethrows unexpected errors', async () => {
    const error = new Error('boom');
    getReplacements.mockRejectedValue(error);

    const query = useGetReplacements({ client, replacementsId: 'rep-err', enabled: true }) as {
      queryFn: () => Promise<unknown>;
    };

    await expect(query.queryFn()).rejects.toThrow('boom');
  });

  it('does not retry for expected auth/not-found failures', () => {
    const query = useGetReplacements({ client, replacementsId: 'rep-1', enabled: true }) as {
      retry: (failureCount: number, error: unknown) => boolean;
    };

    expect(query.retry(0, { kind: 'not_found' })).toBe(false);
    expect(query.retry(0, { kind: 'forbidden' })).toBe(false);
    expect(query.retry(0, { kind: 'unauthorized' })).toBe(false);
  });

  it('retries generic errors up to three attempts', () => {
    const query = useGetReplacements({ client, replacementsId: 'rep-1', enabled: true }) as {
      retry: (failureCount: number, error: unknown) => boolean;
    };

    expect(query.retry(0, new Error('transient'))).toBe(true);
    expect(query.retry(1, new Error('transient'))).toBe(true);
    expect(query.retry(2, new Error('transient'))).toBe(true);
    expect(query.retry(3, new Error('transient'))).toBe(false);
  });
});
