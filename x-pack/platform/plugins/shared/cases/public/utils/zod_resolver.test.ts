/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { zodResolver } from './zod_resolver';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  nested: z.object({ count: z.number().min(1, 'Count must be positive') }),
});

const resolve = (values: unknown) => zodResolver(schema)(values as never, undefined, {} as never);

describe('zodResolver', () => {
  it('returns parsed values and no errors for valid data', async () => {
    const data = { name: 'a', nested: { count: 2 } };

    expect(await resolve(data)).toEqual({ values: data, errors: {} });
  });

  it('maps issues to nested field errors', async () => {
    const { values, errors } = await resolve({ name: '', nested: { count: 0 } });

    expect(values).toEqual({});
    expect(errors).toEqual({
      name: { type: 'too_small', message: 'Name is required' },
      nested: { count: { type: 'too_small', message: 'Count must be positive' } },
    });
  });

  it('keeps only the first error per path', async () => {
    const multi = z.object({
      name: z.string().min(3, 'too short').regex(/^a/, 'must start with a'),
    });
    const { errors } = await zodResolver(multi)({ name: 'b' } as never, undefined, {} as never);

    expect(errors).toEqual({ name: { type: 'too_small', message: 'too short' } });
  });

  it('rethrows non-zod errors', async () => {
    const boom = z.string().refine(() => {
      throw new Error('boom');
    });

    await expect(zodResolver(boom)('x' as never, undefined, {} as never)).rejects.toThrow('boom');
  });
});
