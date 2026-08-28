/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRoundAuthor } from '@kbn/agent-builder-common';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { getInputAuthor, isCurrentUserAuthor } from './round_author';

const currentUser = {
  uid: 'current-user',
  enabled: true,
  user: {
    username: 'alice',
    full_name: 'Alice Maria',
  },
  data: {
    avatar: {
      initials: 'AM',
    },
  },
} as UserProfileWithAvatar;

describe('isCurrentUserAuthor', () => {
  it('matches a current user profile author by uid', () => {
    expect(isCurrentUserAuthor({ author: currentUser, currentUser })).toBe(true);
  });

  it('matches a persisted round author by id', () => {
    const author: ConversationRoundAuthor = {
      id: 'current-user',
      username: 'alice',
    };

    expect(isCurrentUserAuthor({ author, currentUser })).toBe(true);
  });

  it('returns false when the author does not match the current user', () => {
    const author: ConversationRoundAuthor = {
      id: 'other-user',
      username: 'elastic',
    };

    expect(isCurrentUserAuthor({ author, currentUser })).toBe(false);
  });
});

describe('getInputAuthor', () => {
  it('uses the current user as the author for local pending rounds without persisted author attribution', () => {
    expect(
      getInputAuthor({
        author: undefined,
        currentUser,
        isPendingCurrentRound: true,
      })
    ).toBe(currentUser);
  });

  it('keeps persisted author attribution when it exists', () => {
    const author: ConversationRoundAuthor = {
      id: 'other-user',
      username: 'elastic',
    };

    expect(
      getInputAuthor({
        author,
        currentUser,
        isPendingCurrentRound: true,
      })
    ).toBe(author);
  });

  it('does not use the current user for non-pending current rounds without persisted author attribution', () => {
    expect(
      getInputAuthor({
        author: undefined,
        currentUser,
        isPendingCurrentRound: false,
      })
    ).toBeUndefined();
  });
});
