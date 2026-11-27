/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attributes } from './test_utils';
import { getTotal, toObservable } from './utils';

describe('getTotal', () => {
  it.each([
    { form: 'a hits total object', total: { value: 7, relation: 'eq' }, expected: 7 },
    { form: 'a number', total: 7, expected: 7 },
    { form: 'a missing total', total: undefined, expected: 0 },
  ] as const)('reads $form', ({ total, expected }) => {
    expect(getTotal(total)).toBe(expected);
  });
});

describe('toObservable', () => {
  it('maps the stored attributes to an observable', () => {
    expect(
      toObservable({
        id: 'observable-1',
        attributes: attributes({
          description: 'Seen in a phishing email',
          updated_at: '2026-11-07T10:00:00.000Z',
        }),
      })
    ).toEqual({
      id: 'observable-1',
      typeKey: 'observable-type-ipv4',
      value: '10.0.0.8',
      description: 'Seen in a phishing email',
      createdAt: '2026-11-06T09:30:00.000Z',
      updatedAt: '2026-11-07T10:00:00.000Z',
    });
  });

  it('returns null for a description and update time the object does not store', () => {
    const { description, updatedAt } = toObservable({
      id: 'observable-1',
      attributes: attributes({ description: undefined, updated_at: undefined }),
    });

    expect(description).toBeNull();
    expect(updatedAt).toBeNull();
  });
});
