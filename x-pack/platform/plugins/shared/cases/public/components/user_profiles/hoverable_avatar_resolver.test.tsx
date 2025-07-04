/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { CaseUser } from '../../containers/types';
import { userProfiles, userProfilesMap } from '../../containers/user_profiles/api.mock';
import { HoverableAvatarResolver } from './hoverable_avatar_resolver';

describe('HoverableAvatarResolver', () => {
  it('renders the avatar using the elastic user information when the profile is not present', async () => {
    const user: CaseUser = {
      username: 'user',
      email: 'some.user@google.com',
      fullName: 'Some Super User',
    };

    render(<HoverableAvatarResolver user={user} />);

    expect(screen.getByText('SS')).toBeInTheDocument();
  });

  it('renders the avatar when the profile uid is not found', async () => {
    const user: CaseUser = {
      username: 'some_user',
      profileUid: '123',
      fullName: null,
      email: null,
    };

    render(<HoverableAvatarResolver user={user} />);

    expect(screen.getByText('s')).toBeInTheDocument();
  });

  it('renders the avatar using the profile', async () => {
    const user: CaseUser = {
      username: userProfiles[0].user.username,
      profileUid: userProfiles[0].uid,
      fullName: null,
      email: null,
    };

    render(<HoverableAvatarResolver user={user} userProfiles={userProfilesMap} />);

    expect(screen.getByText('DR')).toBeInTheDocument();
  });

  it('renders the tooltip when hovering', async () => {
    const user: CaseUser = {
      username: userProfiles[0].user.username,
      profileUid: userProfiles[0].uid,
      fullName: null,
      email: null,
    };

    render(<HoverableAvatarResolver user={user} userProfiles={userProfilesMap} />);

    fireEvent.mouseOver(screen.getByText('DR'));

    await screen.findByTestId('user-profile-tooltip');

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
  });
});
