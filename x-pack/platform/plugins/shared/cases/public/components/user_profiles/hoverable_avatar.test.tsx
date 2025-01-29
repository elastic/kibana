/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import { HoverableAvatar } from './hoverable_avatar';

// Failing: See https://github.com/elastic/kibana/issues/207406
describe.skip('HoverableAvatar', () => {
  it('renders the avatar', async () => {
    render(<HoverableAvatar userInfo={userProfiles[0]} />);

    expect(screen.getByText('DR')).toBeInTheDocument();
  });

  it('renders the tooltip when hovering', async () => {
    render(<HoverableAvatar userInfo={userProfiles[0]} />);

    fireEvent.mouseOver(screen.getByText('DR'));

    await waitFor(() => screen.getByTestId('user-profile-tooltip'));

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
  });
});
