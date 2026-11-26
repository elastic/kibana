/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findCompositeSLOParamsSchema } from './find_composite_slo';

const parseQuery = (query: Record<string, unknown>) =>
  findCompositeSLOParamsSchema.safeParse({ query });

describe('FindCompositeSLO schema validation', () => {
  it('parses comma separated tags and statuses', () => {
    const result = parseQuery({ tags: 'a, b', status: 'HEALTHY,VIOLATED' });

    expect(result.success).toBe(true);
    expect(result.data?.query?.tags).toEqual(['a', 'b']);
    expect(result.data?.query?.status).toEqual(['HEALTHY', 'VIOLATED']);
  });

  it.each(['search', 'tags'])('bounds %s to 10000 characters', (field) => {
    expect(parseQuery({ [field]: 'a'.repeat(10000) }).success).toBe(true);
    expect(parseQuery({ [field]: 'a'.repeat(10001) }).success).toBe(false);
  });

  it('bounds status to 1024 characters', () => {
    const validStatuses = Array.from({ length: 1024 / 8 }, () => 'HEALTHY').join(',');

    expect(parseQuery({ status: validStatuses.slice(0, 1024) }).success).toBe(true);
    expect(parseQuery({ status: `${validStatuses},HEALTHY` }).success).toBe(false);
  });
});
