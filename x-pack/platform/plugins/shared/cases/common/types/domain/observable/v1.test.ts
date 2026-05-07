/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseObservableRt } from './v1';
import { CaseObservableSchema } from '../../domain_zod/observable/v1';

describe('CaseObservableRt', () => {
  const observable = {
    description: null,
    id: '274fcbfc-87b8-47d0-9f17-bfe98e5453e9',
    typeKey: 'ef528526-2af9-4345-9b78-046512c5bbd6',
    value: 'email@example.com',
    createdAt: '2024-10-01',
    updatedAt: '2024-10-01',
  };

  it('has expected attributes in request', () => {
    const query = CaseObservableRt.decode(observable);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: observable,
    });
  });

  it('zod: has expected attributes in request', () => {
    const result = CaseObservableSchema.safeParse(observable);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(observable);
  });

  it('zod: strips unknown fields', () => {
    const result = CaseObservableSchema.safeParse({ ...observable, foo: 'bar' });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(observable);
  });
});
