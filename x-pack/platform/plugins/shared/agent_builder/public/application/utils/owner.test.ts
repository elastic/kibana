/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveOwnerLabel } from './owner';

jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: (_id: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
  },
}));

describe('resolveOwnerLabel', () => {
  it('returns undefined when owner is undefined', () => {
    expect(resolveOwnerLabel(undefined)).toBeUndefined();
  });

  it('returns "Elastic" for the system user', () => {
    expect(resolveOwnerLabel({ username: 'system' })).toBe('Elastic');
  });

  it('returns the resolved display name from the profile map when id matches', () => {
    const profileMap = new Map([['uid-123', 'Jane Doe']]);
    expect(resolveOwnerLabel({ id: 'uid-123', username: 'jdoe' }, profileMap)).toBe('Jane Doe');
  });

  it('falls back to username when id is not in the profile map', () => {
    const profileMap = new Map([['uid-999', 'Someone Else']]);
    expect(resolveOwnerLabel({ id: 'uid-123', username: 'jdoe' }, profileMap)).toBe('jdoe');
  });

  it('falls back to username when no profile map is provided', () => {
    expect(resolveOwnerLabel({ id: 'uid-123', username: 'jdoe' })).toBe('jdoe');
  });

  it('falls back to username when owner has no id', () => {
    const profileMap = new Map([['uid-123', 'Jane Doe']]);
    expect(resolveOwnerLabel({ username: 'jdoe' }, profileMap)).toBe('jdoe');
  });
});
