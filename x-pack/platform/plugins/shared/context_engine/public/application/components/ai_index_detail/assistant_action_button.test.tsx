/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { AiIndexConversationState } from '../../../types';
import { AssistantActionButton } from './assistant_action_button';

const renderButton = (conversation: AiIndexConversationState, onClick = jest.fn()) => {
  render(
    <AssistantActionButton
      conversation={conversation}
      onClick={onClick}
      startLabel="Help me set this up"
      continueLabel="Continue setup"
      workingLabel="Setting up…"
      data-test-subj="assistantAction"
    />
  );

  return { onClick, button: screen.getByTestId('assistantAction') };
};

describe('AssistantActionButton', () => {
  it('offers to start when this index has no conversation yet', () => {
    const { button } = renderButton({ isRunning: false });

    expect(button).toHaveTextContent('Help me set this up');
  });

  it('offers to continue once a conversation exists, so a second press does not look like a reset', () => {
    const { button } = renderButton({ conversationId: 'conv-1', isRunning: false });

    expect(button).toHaveTextContent('Continue setup');
  });

  it('says the agent is working while it is still producing', () => {
    const { button } = renderButton({ conversationId: 'conv-1', isRunning: true });

    expect(button).toHaveTextContent('Setting up…');
  });

  it('stays clickable while working, since that is how the user gets back to watching it', () => {
    const { button, onClick } = renderButton({ conversationId: 'conv-1', isRunning: true });

    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
