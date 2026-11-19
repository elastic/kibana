/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { apiPrivileges } from '../../common/features';
import { canActOnUserMemory } from './memory_user';

const requestWith = (authzResult?: Record<string, boolean>) =>
  Object.assign(httpServerMock.createKibanaRequest(), { authzResult });

describe('canActOnUserMemory', () => {
  it('allows the memory of the caller without manage memory', () => {
    expect(canActOnUserMemory(requestWith({}), 'jdoe', 'jdoe')).toBe(true);
  });

  it('rejects the memory of another user without manage memory', () => {
    expect(
      canActOnUserMemory(requestWith({ [apiPrivileges.manageMemory]: false }), 'other', 'jdoe')
    ).toBe(false);
  });

  it('allows the memory of another user with manage memory', () => {
    expect(
      canActOnUserMemory(requestWith({ [apiPrivileges.manageMemory]: true }), 'other', 'jdoe')
    ).toBe(true);
  });

  it('treats any user as another user when the caller has no profile', () => {
    expect(canActOnUserMemory(requestWith({}), 'jdoe', undefined)).toBe(false);
    expect(
      canActOnUserMemory(requestWith({ [apiPrivileges.manageMemory]: true }), 'jdoe', undefined)
    ).toBe(true);
  });

  it('rejects the memory of another user when no privileges were checked', () => {
    expect(canActOnUserMemory(requestWith(undefined), 'other', 'jdoe')).toBe(false);
  });
});
