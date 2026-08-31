/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiAvatar } from '@elastic/eui';
import { UserAvatar, type UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { AgentDefinition } from '@kbn/agent-builder-common/agents';
import { useRoundAuthorProfile } from '../../../hooks/use_round_author_profile';
import { AgentAvatar } from '../../common/agent_avatar';
import { RoundAuthorAvatar } from './round_author_avatar';

jest.mock('../../../hooks/use_round_author_profile', () => ({
  useRoundAuthorProfile: jest.fn(),
}));

jest.mock('@kbn/user-profile-components', () => ({
  getUserDisplayName: jest.fn((user) => user.full_name ?? user.username),
  UserAvatar: jest.fn(({ avatar }) => (
    <div data-test-subj="agentBuilderUserAvatar">{avatar?.initials}</div>
  )),
}));

jest.mock('../../common/agent_avatar', () => ({
  AgentAvatar: jest.fn(({ agent }) => (
    <div data-test-subj="agentBuilderAgentAvatar">{agent.name}</div>
  )),
}));

jest.mock('@elastic/eui', () => ({
  EuiAvatar: jest.fn(({ name }) => <div data-test-subj="agentBuilderFallbackAvatar">{name}</div>),
}));

const mockUseRoundAuthorProfile = jest.mocked(useRoundAuthorProfile);
const mockAgentAvatar = jest.mocked(AgentAvatar);
const mockUserAvatar = jest.mocked(UserAvatar);
const mockEuiAvatar = jest.mocked(EuiAvatar);

describe('RoundAuthorAvatar', () => {
  const agent: AgentDefinition = {
    id: 'agent-1',
    type: 'chat',
    name: 'Custom Agent',
    description: '',
    readonly: false,
    configuration: {
      tools: [],
    },
  };
  const authorProfile: UserProfileWithAvatar = {
    uid: 'user-1',
    enabled: true,
    user: {
      username: 'alice',
      full_name: 'Alice Example',
    },
    data: {
      avatar: {
        initials: 'AE',
        color: '#f4d9ff',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoundAuthorProfile.mockReturnValue(undefined);
  });

  it('renders the agent avatar when an agent is available', () => {
    render(<RoundAuthorAvatar agent={agent} />);

    expect(mockAgentAvatar).toHaveBeenCalledWith(
      expect.objectContaining({
        agent,
        size: 's',
        iconSize: 'l',
        iconPaddingSize: 'none',
      }),
      expect.anything()
    );
    expect(screen.getByTestId('agentBuilderAgentAvatar')).toHaveTextContent('Custom Agent');
  });

  it('renders the user avatar when a user profile is available', () => {
    mockUseRoundAuthorProfile.mockReturnValue(authorProfile);

    render(<RoundAuthorAvatar author={authorProfile} />);

    expect(mockAgentAvatar).not.toHaveBeenCalled();
    expect(mockUserAvatar).toHaveBeenCalledWith(
      expect.objectContaining({
        user: authorProfile.user,
        avatar: authorProfile.data?.avatar,
        size: 's',
      }),
      expect.anything()
    );
    expect(screen.getByTestId('agentBuilderUserAvatar')).toHaveTextContent('AE');
  });

  it('renders a fallback avatar from the author display name when no profile is available', () => {
    render(
      <RoundAuthorAvatar author={{ id: 'user-2', full_name: 'Jane Doe', username: 'jdoe' }} />
    );

    expect(mockEuiAvatar).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 's',
        name: 'Jane Doe',
      }),
      expect.anything()
    );
    expect(screen.getByTestId('agentBuilderFallbackAvatar')).toHaveTextContent('Jane Doe');
  });
});
