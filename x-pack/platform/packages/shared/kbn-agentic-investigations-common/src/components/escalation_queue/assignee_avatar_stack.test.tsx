/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { AssigneeAvatarStack } from './assignee_avatar_stack';

const makeProfile = (
  uid: string,
  user: Partial<UserProfileWithAvatar['user']> = {}
): UserProfileWithAvatar => ({
  uid,
  enabled: true,
  user: { username: uid, ...user },
  data: {},
});

describe('AssigneeAvatarStack', () => {
  it('renders all avatars when the count is within the visible limit', () => {
    const profiles = [
      makeProfile('a', { full_name: 'Alice' }),
      makeProfile('b', { full_name: 'Bob' }),
      makeProfile('c', { full_name: 'Carol' }),
      makeProfile('d', { full_name: 'Dave' }),
    ];
    renderWithKibanaRenderContext(<AssigneeAvatarStack profiles={profiles} />);
    expect(screen.getAllByRole('img')).toHaveLength(4);
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  it('renders nothing for an empty list', () => {
    renderWithKibanaRenderContext(<AssigneeAvatarStack profiles={[]} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  it('shows 4 avatars and a +1 badge when there are 5 profiles', () => {
    const profiles = Array.from({ length: 5 }, (_, i) => makeProfile(`user-${i}`));
    renderWithKibanaRenderContext(<AssigneeAvatarStack profiles={profiles} />);
    expect(screen.getAllByRole('img')).toHaveLength(4);
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('counts multiple overflow profiles correctly', () => {
    const profiles = Array.from({ length: 7 }, (_, i) => makeProfile(`user-${i}`));
    renderWithKibanaRenderContext(<AssigneeAvatarStack profiles={profiles} />);
    expect(screen.getAllByRole('img')).toHaveLength(4);
    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('overflow badge is keyboard-focusable', () => {
    const profiles = Array.from({ length: 5 }, (_, i) => makeProfile(`user-${i}`));
    const { container } = renderWithKibanaRenderContext(
      <AssigneeAvatarStack profiles={profiles} />
    );
    expect(container.querySelector('[tabindex="0"]')).not.toBeNull();
  });

  describe('overflow tooltip display names', () => {
    it('prefers full_name, then email, then username, then uid for the tooltip', () => {
      const profiles = [
        // Four visible
        makeProfile('v0'),
        makeProfile('v1'),
        makeProfile('v2'),
        makeProfile('v3'),
        // Overflow — each exercises one step of the fallback chain
        makeProfile('uid-full', { full_name: 'Alice Smith', email: 'a@example.com' }),
        makeProfile('uid-email', { email: 'bob@example.com' }),
        makeProfile('uid-username', { username: 'charlie' }),
        makeProfile('uid-fallback', { username: '' }), // falls through to uid
      ];
      renderWithKibanaRenderContext(<AssigneeAvatarStack profiles={profiles} />);

      const badge = screen.getByText('+4');
      fireEvent.mouseOver(badge);

      expect(
        screen.getByText('Alice Smith, bob@example.com, charlie, uid-fallback')
      ).toBeInTheDocument();
    });
  });
});
