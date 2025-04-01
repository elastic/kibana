/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';
import { SmallUserAvatar } from './small_user_avatar';
import { userProfiles } from '../../containers/user_profiles/api.mock';

describe('SmallUserAvatar', () => {
  it('renders an avatar with size small', () => {
    render(<SmallUserAvatar userInfo={userProfiles[0]} />);

    expect(
      screen.getByTestId(`case-user-profile-avatar-${userProfiles[0].user.username}`)
    ).toHaveClass('euiAvatar--s');
  });
});
