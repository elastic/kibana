/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRoundAuthor } from '@kbn/agent-builder-common';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { isUserProfileAuthor } from './round_author';

describe('isUserProfileAuthor', () => {
  it('returns true for user profile authors', () => {
    const author = {
      uid: 'user-1',
      enabled: true,
      user: { username: 'alice' },
      data: {},
    } as UserProfileWithAvatar;

    expect(isUserProfileAuthor(author)).toBe(true);
  });

  it('returns false for persisted round authors', () => {
    const author: ConversationRoundAuthor = {
      id: 'user-1',
      username: 'alice',
    };

    expect(isUserProfileAuthor(author)).toBe(false);
  });
});
