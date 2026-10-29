/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canLinkEscalation, conversationPrincipal } from './can_link_escalation';

const owner = { id: 'owner-uid', username: 'owner' };
const member = { type: 'user' as const, id: 'member-uid' };

describe('canLinkEscalation', () => {
  it('allows the owner', () => {
    expect(
      canLinkEscalation(
        { user: owner, access_control: { entries: [] } },
        { profileUid: 'owner-uid', username: 'owner' }
      )
    ).toBe(true);
  });

  it('allows a listed participant who is not the owner', () => {
    expect(
      canLinkEscalation(
        { user: owner, access_control: { entries: [member] } },
        { profileUid: 'member-uid', username: 'member' }
      )
    ).toBe(true);
  });

  it('rejects someone who can only see a public escalation', () => {
    expect(
      canLinkEscalation(
        { user: owner, access_control: { entries: [member] } },
        { profileUid: 'outsider-uid', username: 'outsider' }
      )
    ).toBe(false);
  });

  it('rejects a caller with no profile when the escalation has an owner id', () => {
    expect(
      canLinkEscalation({ user: owner, access_control: { entries: [] } }, { username: 'owner' })
    ).toBe(false);
  });

  it('falls back to username only when the escalation has no owner id', () => {
    expect(
      canLinkEscalation(
        { user: { username: 'legacy' }, access_control: { entries: [] } },
        { username: 'legacy' }
      )
    ).toBe(true);
  });

  it('builds the realm id conversations store when no profile uid is present', () => {
    expect(
      conversationPrincipal({
        username: 'esc_member',
        authentication_realm: { type: 'native', name: 'default_native' },
      })
    ).toEqual({
      profileUid: 'realm:["native","default_native","esc_member"]',
      username: 'esc_member',
    });
  });

  it('returns username only for an API key whose profile was not resolved', () => {
    expect(
      conversationPrincipal({
        username: 'esc_member',
        authentication_type: 'api_key',
        authentication_realm: { type: '_es_api_key', name: '_es_api_key' },
      })
    ).toEqual({ username: 'esc_member' });
  });

  it('prefers an activated profile uid over the realm id', () => {
    expect(
      conversationPrincipal({
        username: 'esc_member',
        profile_uid: 'u_profile',
        authentication_realm: { type: 'native', name: 'default_native' },
      }).profileUid
    ).toBe('u_profile');
  });
});
