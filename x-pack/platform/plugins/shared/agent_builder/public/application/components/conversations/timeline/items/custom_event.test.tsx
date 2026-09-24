/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { render, screen } from '@testing-library/react';
import { useConversationId } from '../../../../context/conversation/use_conversation_id';
import { CUSTOM_EVENT_TYPE, createCustomEvent } from './custom_event.factory';
import { createCustomEventItem } from './timeline_item.factory';
import { CustomEvent } from './custom_event';

jest.mock('../../../../context/conversation/use_conversation_id', () => ({
  useConversationId: jest.fn(),
}));

describe('CustomEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useConversationId).mockReturnValue('conv-1');
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
