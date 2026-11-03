/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_OBSERVABLE_DESCRIPTION_LENGTH, MAX_OBSERVABLE_VALUE_LENGTH } from '../../../constants';
import { CaseObservableSchema } from './v1';

describe('CaseObservableSchema', () => {
  const observable = {
    description: null,
    id: '274fcbfc-87b8-47d0-9f17-bfe98e5453e9',
    typeKey: 'ef528526-2af9-4345-9b78-046512c5bbd6',
    value: 'email@example.com',
    createdAt: '2024-10-01',
    updatedAt: '2024-10-01',
  };

  it('has expected attributes in request', () => {
    const result = CaseObservableSchema.safeParse(observable);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(observable);
  });

  it('still parses stored observables longer than the request bounds', () => {
    const legacyObservable = {
      ...observable,
      value: 'a'.repeat(MAX_OBSERVABLE_VALUE_LENGTH + 1),
      description: 'a'.repeat(MAX_OBSERVABLE_DESCRIPTION_LENGTH + 1),
    };

    const result = CaseObservableSchema.safeParse(legacyObservable);

    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(legacyObservable);
  });

  it('strips unknown fields', () => {
    const result = CaseObservableSchema.safeParse({ ...observable, foo: 'bar' });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(observable);
  });
});
