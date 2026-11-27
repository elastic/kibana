/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { applyEach } from './apply_each';

interface Resource {
  id: string;
}

const resources: Resource[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const idOf = ({ id }: Resource) => id;

describe('applyEach', () => {
  it('writes every resource and counts them', async () => {
    const write = jest.fn().mockResolvedValue(undefined);

    const result = await applyEach({
      resources,
      signal: new AbortController().signal,
      idOf,
      write,
    });

    expect(result).toEqual({ applied: 3, errors: [] });
    expect(write.mock.calls).toEqual([[{ id: 'a' }], [{ id: 'b' }], [{ id: 'c' }]]);
  });

  it('reports a thrown error under its id with toApplyError, and writes the rest', async () => {
    const write = jest.fn(async ({ id }: Resource) => {
      if (id === 'b') {
        throw Boom.badRequest('invalid');
      }
    });

    const result = await applyEach({
      resources,
      signal: new AbortController().signal,
      idOf,
      write,
    });

    expect(result).toEqual({
      applied: 2,
      errors: [{ id: 'b', message: 'invalid', permanent: true }],
    });
  });

  it('reports the details a write returns without counting the resource', async () => {
    const write = jest.fn(async ({ id }: Resource) =>
      id === 'a' ? { message: 'refused', permanent: true } : undefined
    );

    const result = await applyEach({
      resources,
      signal: new AbortController().signal,
      idOf,
      write,
    });

    expect(result).toEqual({
      applied: 2,
      errors: [{ id: 'a', message: 'refused', permanent: true }],
    });
  });

  it('describes a thrown error with describeError when given', async () => {
    const error = new Error('taken');
    const describeError = jest.fn(async () => ({ message: 'described', conflict: true }));

    const result = await applyEach({
      resources: [{ id: 'a' }],
      signal: new AbortController().signal,
      idOf,
      write: async () => {
        throw error;
      },
      describeError,
    });

    expect(describeError).toHaveBeenCalledWith(error, { id: 'a' });
    expect(result).toEqual({
      applied: 0,
      errors: [{ id: 'a', message: 'described', conflict: true }],
    });
  });

  it('throws on abort instead of reporting the next resource as failed', async () => {
    const controller = new AbortController();
    const write = jest.fn(async ({ id }: Resource) => {
      if (id === 'a') {
        controller.abort();
      }
    });

    await expect(
      applyEach({ resources, signal: controller.signal, idOf, write })
    ).rejects.toThrow();
    expect(write).toHaveBeenCalledTimes(1);
  });
});
