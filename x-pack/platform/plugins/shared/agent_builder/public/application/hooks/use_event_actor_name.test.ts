/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { ConversationOriginType, EventActorType } from '@kbn/agent-builder-common';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useUserProfiles } from './use_user_profiles';
import { useEventActorName } from './use_event_actor_name';

jest.mock('./use_user_profiles', () => ({
  useUserProfiles: jest.fn(),
}));

const mockUseUserProfiles = jest.mocked(useUserProfiles);

const profile = {
  uid: 'u_uid-1',
  enabled: true,
  user: { username: '12345678', full_name: 'Numeric Person' },
  data: {},
} as UserProfileWithAvatar;

const mockProfiles = (profiles: UserProfileWithAvatar[]) => {
  mockUseUserProfiles.mockReturnValue({ data: profiles } as unknown as ReturnType<
    typeof useUserProfiles
  >);
};

describe('useEventActorName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfiles([]);
  });

  it('returns the profile name for a Kibana user actor', () => {
    mockProfiles([profile]);

    const { result } = renderHook(() =>
      useEventActorName({ type: EventActorType.user, id: 'u_uid-1', username: '12345678' })
    );

    expect(mockUseUserProfiles).toHaveBeenCalledWith({ uids: ['u_uid-1'] });
    expect(result.current).toBe('Numeric Person');
  });

  it('falls back to the actor name when the profile is not found', () => {
    const { result } = renderHook(() =>
      useEventActorName({ type: EventActorType.user, id: 'u_uid-1', username: 'elastic' })
    );

    expect(result.current).toBe('elastic');
  });

  it('does not look up a profile for an agent actor', () => {
    const { result } = renderHook(() =>
      useEventActorName({ type: EventActorType.agent, id: 'elastic-ai-agent', username: 'Agent' })
    );

    expect(mockUseUserProfiles).toHaveBeenCalledWith({ uids: [] });
    expect(result.current).toBe('Agent');
  });

  it('does not look up a profile for an external actor', () => {
    const { result } = renderHook(() =>
      useEventActorName({
        type: EventActorType.user,
        id: 'U123',
        full_name: 'Slack Person',
        origin: { type: ConversationOriginType.Slack },
      })
    );

    expect(mockUseUserProfiles).toHaveBeenCalledWith({ uids: [] });
    expect(result.current).toBe('Slack Person');
  });

  it('returns undefined when the actor has no name', () => {
    const { result } = renderHook(() =>
      useEventActorName({ type: EventActorType.system, id: 'kibana' })
    );

    expect(result.current).toBeUndefined();
  });
});
