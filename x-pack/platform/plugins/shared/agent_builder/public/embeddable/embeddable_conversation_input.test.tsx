/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderInternalService } from '../services';
import { EmbeddableConversationInputInternal } from './embeddable_conversation_input';

const mockNavigateToAgentBuilderUrl = jest.fn();
const mockAttachments: ConversationAttachment[] = [
  { id: 'image-1', type: 'image', data: { fileId: 'file-1' } } as unknown as ConversationAttachment,
];

jest.mock('../application/context/conversation/embeddable_conversations_provider', () => ({
  EmbeddableConversationsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../application/context/conversation/conversation_context', () => ({
  useConversationContext: () => ({ attachments: mockAttachments, agentId: 'agent-1' }),
}));

jest.mock('../application/hooks/use_navigation', () => ({
  useNavigation: () => ({ navigateToAgentBuilderUrl: mockNavigateToAgentBuilderUrl }),
}));

const mockConversationInputProps = jest.fn();

jest.mock('../application/components/conversations/conversation_input/conversation_input', () => ({
  ConversationInput: (props: {
    onSubmitOverride: (message: string) => void;
    autoFocus?: boolean;
  }) => {
    mockConversationInputProps(props);
    return (
      <button type="button" onClick={() => props.onSubmitOverride('Build a workflow')}>
        {'Submit'}
      </button>
    );
  },
}));

const renderInput = (onSubmit?: (message: string, attachments: ConversationAttachment[]) => void) =>
  render(
    <EmbeddableConversationInputInternal
      onSubmit={onSubmit}
      services={{} as AgentBuilderInternalService}
      coreStart={{} as CoreStart}
    />
  );

describe('EmbeddableConversationInputInternal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the message and its attachments (e.g. pasted images) to onSubmit', () => {
    const onSubmit = jest.fn();
    renderInput(onSubmit);

    fireEvent.click(screen.getByText('Submit'));

    expect(onSubmit).toHaveBeenCalledWith('Build a workflow', mockAttachments);
    expect(mockNavigateToAgentBuilderUrl).not.toHaveBeenCalled();
  });

  it('navigates to Agent Builder with the attachments when onSubmit is not set', () => {
    renderInput();

    fireEvent.click(screen.getByText('Submit'));

    expect(mockNavigateToAgentBuilderUrl).toHaveBeenCalledWith(expect.any(String), undefined, {
      initialMessage: 'Build a workflow',
      attachments: mockAttachments,
    });
  });

  // https://github.com/elastic/kibana/issues/298539
  it('does not auto-focus, so the embedded input cannot take focus from the host page', () => {
    renderInput();

    expect(mockConversationInputProps).toHaveBeenCalledWith(
      expect.objectContaining({ autoFocus: false })
    );
  });
});
