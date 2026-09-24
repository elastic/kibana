/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useConversationId } from '../../../../context/conversation/use_conversation_id';
import { CUSTOM_EVENT_TYPE } from './custom_event.factory';
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

  it('renders nothing without a conversation id', () => {
    jest.mocked(useConversationId).mockReturnValue(undefined);

    const { container } = render(<CustomEvent item={createCustomEventItem()} />);

    expect(container).toBeEmptyDOMElement();
  });
});
