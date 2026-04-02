/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { CommentTimelineAvatar } from './comment_timeline_avatar';
import { CommentRenderingProvider } from '../../user_actions/comment/comment_rendering_context';
import type { CommentRenderingContextValue } from '../../user_actions/comment/comment_rendering_context';
import { renderWithTestingProviders } from '../../../common/mock';
import { getMockCommentRenderingContext } from '../../user_actions/mock';
import { userProfiles, userProfilesMap } from '../../../containers/user_profiles/api.mock';
import type { CommentTimelineAvatarProps } from './comment_timeline_avatar';

jest.mock('../../../common/lib/kibana');

const createdBy = {
  fullName: 'Elastic',
  username: 'elastic',
  email: 'elastic@example.com',
};

const defaultProps: CommentTimelineAvatarProps = {
  createdBy,
};

const utils = getMockCommentRenderingContext({ userProfiles: userProfilesMap });

const renderComponent = (
  props: CommentTimelineAvatarProps = defaultProps,
  context: CommentRenderingContextValue = utils
) =>
  renderWithTestingProviders(
    <CommentRenderingProvider value={context}>
      <CommentTimelineAvatar {...props} />
    </CommentRenderingProvider>
  );

describe('CommentTimelineAvatar', () => {
  it('renders an avatar from props createdBy', () => {
    renderComponent();
    expect(screen.getByText('E')).toBeInTheDocument();
  });

  it('renders with user profile when available', () => {
    const damagedRaccoon = userProfiles[0];
    const propsWithProfileUser: CommentTimelineAvatarProps = {
      createdBy: {
        fullName: damagedRaccoon.user.full_name,
        username: damagedRaccoon.user.username,
        email: damagedRaccoon.user.email,
        profileUid: damagedRaccoon.uid,
      },
    };

    renderComponent(propsWithProfileUser);
    expect(screen.getByTestId('case-user-profile-avatar-damaged_raccoon')).toBeInTheDocument();
  });

  it('renders nothing when no createdBy is available', () => {
    renderComponent({}, getMockCommentRenderingContext());
    expect(screen.queryByText('E')).not.toBeInTheDocument();
  });
});
