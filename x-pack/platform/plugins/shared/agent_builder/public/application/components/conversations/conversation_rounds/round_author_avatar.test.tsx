/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { UserAvatar, type UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { AgentDefinition } from '@kbn/agent-builder-common/agents';
import { useRoundAuthorDetails } from '../../../hooks/use_round_author_details';
import { AgentAvatar } from '../../common/agent_avatar';
import { RoundAuthorAvatar } from './round_author_avatar';

jest.mock('../../../hooks/use_round_author_details', () => ({
  useRoundAuthorDetails: jest.fn(),
}));

jest.mock('@kbn/user-profile-components', () => ({
  UserAvatar: jest.fn(({ avatar }) => (
    <div data-test-subj="agentBuilderUserAvatar">{avatar?.initials}</div>
  )),
}));

jest.mock('../../common/agent_avatar', () => ({
  AgentAvatar: jest.fn(({ agent }) => (
    <div data-test-subj="agentBuilderAgentAvatar">{agent.name}</div>
  )),
}));

const mockUseRoundAuthorDetails = jest.mocked(useRoundAuthorDetails);
const mockAgentAvatar = jest.mocked(AgentAvatar);
const mockUserAvatar = jest.mocked(UserAvatar);

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
  });

  it('renders the agent avatar when an agent is available', () => {
    mockUseRoundAuthorDetails.mockReturnValue({ name: agent.name });

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
    mockUseRoundAuthorDetails.mockReturnValue({
      authorProfile,
      name: 'Alice Example',
    });

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
});
