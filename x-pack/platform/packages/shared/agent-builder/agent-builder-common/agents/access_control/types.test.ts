/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AgentAccessControlRole,
  isEntryCoveredByOwner,
  type AgentAccessControlEntry,
} from './types';

const idBacked: AgentAccessControlEntry = {
  type: 'user',
  id: 'u_owner',
  role: AgentAccessControlRole.User,
};
const nameOnly: AgentAccessControlEntry = {
  type: 'user',
  name: 'owner',
  role: AgentAccessControlRole.User,
};

describe('isEntryCoveredByOwner', () => {
  it('returns false without an owner', () => {
    expect(isEntryCoveredByOwner(idBacked, undefined)).toBe(false);
  });

  it('covers an id-backed entry matching the owner id', () => {
    expect(isEntryCoveredByOwner(idBacked, { id: 'u_owner', username: 'owner' })).toBe(true);
    expect(isEntryCoveredByOwner(idBacked, { id: 'u_other', username: 'other' })).toBe(false);
  });

  it('does not cover an id-backed entry when the owner has no id', () => {
    expect(isEntryCoveredByOwner(idBacked, { username: 'owner' })).toBe(false);
  });

  it('covers a name-only entry matching a legacy owner without an id', () => {
    expect(isEntryCoveredByOwner(nameOnly, { username: 'owner' })).toBe(true);
    expect(isEntryCoveredByOwner(nameOnly, { username: 'other' })).toBe(false);
  });

  it('does not cover a name-only entry when the owner has an id', () => {
    expect(isEntryCoveredByOwner(nameOnly, { id: 'u_owner', username: 'owner' })).toBe(false);
  });
});
