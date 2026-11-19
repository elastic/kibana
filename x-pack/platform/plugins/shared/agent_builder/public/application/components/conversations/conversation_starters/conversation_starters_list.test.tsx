/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConversationStartersList } from './conversation_starters_list';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiProvider>{children}</EuiProvider>
);

describe('ConversationStartersList', () => {
  it('renders nothing when there are no starters', () => {
    const { container } = render(<ConversationStartersList starters={[]} onSelect={jest.fn()} />, {
      wrapper,
    });

    expect(container.querySelector('[data-test-subj="agentBuilderConversationStarters"]')).toBe(
      null
    );
  });

  it('renders a card per starter', () => {
    render(<ConversationStartersList starters={['first', 'second']} onSelect={jest.fn()} />, {
      wrapper,
    });

    expect(screen.getAllByTestId('agentBuilderConversationStarter')).toHaveLength(2);
    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('calls onSelect with the full starter text when a card is clicked', () => {
    const onSelect = jest.fn();
    const longStarter = 'Summarize suspicious login activity from the past 24 hours in a dashboard';
    render(<ConversationStartersList starters={['short', longStarter]} onSelect={onSelect} />, {
      wrapper,
    });

    fireEvent.click(screen.getByText(longStarter));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(longStarter);
  });

  it('does not call onSelect when disabled', () => {
    const onSelect = jest.fn();
    render(<ConversationStartersList starters={['first']} onSelect={onSelect} isDisabled />, {
      wrapper,
    });

    fireEvent.click(screen.getByText('first'));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders the same cards when stacked', () => {
    const onSelect = jest.fn();
    render(
      <ConversationStartersList starters={['first', 'second']} onSelect={onSelect} isStacked />,
      {
        wrapper,
      }
    );

    expect(screen.getAllByTestId('agentBuilderConversationStarter')).toHaveLength(2);

    fireEvent.click(screen.getByText('second'));

    expect(onSelect).toHaveBeenCalledWith('second');
  });

  it('labels the group for assistive technology', () => {
    render(<ConversationStartersList starters={['first']} onSelect={jest.fn()} />, { wrapper });

    expect(screen.getByRole('group', { name: 'Conversation starters' })).toBeInTheDocument();
  });
});
