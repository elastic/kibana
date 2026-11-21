/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { render, screen } from '@testing-library/react';
import { EventActorType } from '@kbn/agent-builder-common';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useUserProfiles } from '../../../../hooks/use_user_profiles';
import { useConversationId } from '../../../../context/conversation/use_conversation_id';
import { CUSTOM_EVENT_TYPE, createCustomEvent } from './custom_event.factory';
import { createCustomEventItem } from './timeline_item.factory';
import { CustomEvent } from './custom_event';

jest.mock('../../../../context/conversation/use_conversation_id', () => ({
  useConversationId: jest.fn(),
}));

jest.mock('../../../../hooks/use_user_profiles', () => ({
  useUserProfiles: jest.fn(),
}));

const mockUseUserProfiles = jest.mocked(useUserProfiles);

const profile = {
  uid: 'u_uid-1',
  enabled: true,
  user: { username: '12345678', full_name: 'Numeric Person' },
  data: {},
} as UserProfileWithAvatar;

const noteHeader = () => ({ icon: 'document', iconTitle: 'Note icon', label: 'Text Note' });

describe('CustomEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useConversationId).mockReturnValue('conv-1');
    mockUseUserProfiles.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useUserProfiles
    >);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('draws what the definition renders, passing it the event and render context', () => {
    const renderEvent = jest.fn(() => <p>Note body</p>);
    const item = createCustomEventItem({
      definition: { type: CUSTOM_EVENT_TYPE, render: renderEvent },
    });

    render(<CustomEvent item={item} isStreaming />);

    expect(screen.getByText('Note body')).toBeInTheDocument();
    expect(renderEvent).toHaveBeenCalledWith(item.event, {
      conversationId: 'conv-1',
      isStreaming: true,
    });
  });

  it('shows a callout instead of crashing when the renderer throws', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const item = createCustomEventItem({
      definition: {
        type: CUSTOM_EVENT_TYPE,
        render: () => {
          throw new Error('boom');
        },
      },
    });

    render(<CustomEvent item={item} />);

    expect(screen.getByText("Couldn't render this event")).toBeInTheDocument();
  });

  it('draws an empty body when the renderer returns null', () => {
    render(<CustomEvent item={createCustomEventItem()} />);

    expect(screen.getByTestId('agentBuilderTimelineCustomEvent')).toHaveTextContent('');
  });

  it('draws no header and an empty avatar column when the definition has no getHeader', () => {
    render(<CustomEvent item={createCustomEventItem()} />);

    expect(screen.getByTestId('agentBuilderTimelineCustomEventAvatar')).toBeEmptyDOMElement();
    expect(screen.queryByText('elastic')).not.toBeInTheDocument();
  });

  it('draws the icon, actor name, label and time when getHeader returns data', () => {
    const event = createCustomEvent();
    const getHeader = jest.fn(() => ({
      icon: 'document',
      iconTitle: 'Note icon',
      label: 'Text Note',
    }));
    const item = createCustomEventItem({
      event,
      definition: { type: CUSTOM_EVENT_TYPE, render: () => null, getHeader },
    });

    render(<CustomEvent item={item} isStreaming />);

    expect(getHeader).toHaveBeenCalledWith(event, { conversationId: 'conv-1', isStreaming: true });
    const icon = screen
      .getByTestId('agentBuilderTimelineCustomEventAvatar')
      .querySelector('[data-euiicon-type="document"]');
    expect(icon).toHaveTextContent('Note icon');
    expect(screen.getByText('elastic')).toBeInTheDocument();
    expect(screen.getByText('Text Note')).toBeInTheDocument();
    expect(screen.getByText(moment(event.created_at).format('LT'))).toBeInTheDocument();
  });

  it('shows the profile name when the actor username is not readable', () => {
    mockUseUserProfiles.mockReturnValue({ data: [profile] } as unknown as ReturnType<
      typeof useUserProfiles
    >);
    const item = createCustomEventItem({
      event: createCustomEvent({
        actor: { type: EventActorType.user, id: 'u_uid-1', username: '12345678' },
      }),
      definition: { type: CUSTOM_EVENT_TYPE, render: () => null, getHeader: noteHeader },
    });

    render(<CustomEvent item={item} />);

    expect(mockUseUserProfiles).toHaveBeenCalledWith({ uids: ['u_uid-1'] });
    expect(screen.getByText('Numeric Person')).toBeInTheDocument();
    expect(screen.queryByText('12345678')).not.toBeInTheDocument();
  });

  it('falls back to the actor username when the profile is not found', () => {
    const item = createCustomEventItem({
      event: createCustomEvent({
        actor: { type: EventActorType.user, id: 'u_uid-1', username: 'elastic' },
      }),
      definition: { type: CUSTOM_EVENT_TYPE, render: () => null, getHeader: noteHeader },
    });

    render(<CustomEvent item={item} />);

    expect(screen.getByText('elastic')).toBeInTheDocument();
  });

  it('does not look up a profile for an agent actor', () => {
    const item = createCustomEventItem({
      event: createCustomEvent({
        actor: { type: EventActorType.agent, id: 'elastic-ai-agent', username: 'Elastic AI Agent' },
      }),
      definition: { type: CUSTOM_EVENT_TYPE, render: () => null, getHeader: noteHeader },
    });

    render(<CustomEvent item={item} />);

    expect(mockUseUserProfiles).toHaveBeenCalledWith({ uids: [] });
    expect(screen.getByText('Elastic AI Agent')).toBeInTheDocument();
  });

  it('shows a callout instead of crashing when getHeader throws', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const item = createCustomEventItem({
      definition: {
        type: CUSTOM_EVENT_TYPE,
        render: () => <p>Note body</p>,
        getHeader: () => {
          throw new Error('boom');
        },
      },
    });

    render(<CustomEvent item={item} />);

    expect(screen.getByText("Couldn't render this event")).toBeInTheDocument();
    expect(screen.queryByText('Note body')).not.toBeInTheDocument();
  });

  it('renders nothing without a conversation id', () => {
    jest.mocked(useConversationId).mockReturnValue(undefined);

    const { container } = render(<CustomEvent item={createCustomEventItem()} />);

    expect(container).toBeEmptyDOMElement();
  });
});
