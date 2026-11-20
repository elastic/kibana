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

  it('renders a card with the label of each starter', () => {
    render(
      <ConversationStartersList
        starters={[{ label: 'first' }, { label: 'second' }]}
        onSelect={jest.fn()}
      />,
      { wrapper }
    );

    expect(screen.getAllByTestId('agentBuilderConversationStarter')).toHaveLength(2);
    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('calls onSelect with the starter when a card is clicked', () => {
    const onSelect = jest.fn();
    const starter = { label: 'Top errors' };
    render(
      <ConversationStartersList starters={[{ label: 'other' }, starter]} onSelect={onSelect} />,
      {
        wrapper,
      }
    );

    fireEvent.click(screen.getByText('Top errors'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(starter);
  });

  it('tags each card for click telemetry with its position and not its text', () => {
    render(
      <ConversationStartersList
        starters={[{ label: 'first' }, { label: 'second' }]}
        onSelect={jest.fn()}
      />,
      { wrapper }
    );

    const [first, second] = screen.getAllByTestId('agentBuilderConversationStarter');

    expect(first).toHaveAttribute('data-ebt-action', 'conversation_starter_click');
    expect(first).toHaveAttribute('data-ebt-element', 'agentBuilder.pageContent');
    expect(first).toHaveAttribute('data-ebt-detail', '1');
    expect(second).toHaveAttribute('data-ebt-detail', '2');
    expect(second.getAttribute('data-ebt-detail')).not.toContain('second');
  });

  it('reports clicks in the flyout under the flyout element', () => {
    render(
      <ConversationStartersList starters={[{ label: 'first' }]} onSelect={jest.fn()} isStacked />,
      {
        wrapper,
      }
    );

    expect(screen.getByTestId('agentBuilderConversationStarter')).toHaveAttribute(
      'data-ebt-element',
      'agentBuilder.flyout'
    );
  });

  it('does not call onSelect when disabled', () => {
    const onSelect = jest.fn();
    render(
      <ConversationStartersList starters={[{ label: 'first' }]} onSelect={onSelect} isDisabled />,
      { wrapper }
    );

    fireEvent.click(screen.getByText('first'));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders the same cards when stacked', () => {
    const onSelect = jest.fn();
    render(
      <ConversationStartersList
        starters={[{ label: 'first' }, { label: 'second' }]}
        onSelect={onSelect}
        isStacked
      />,
      { wrapper }
    );

    expect(screen.getAllByTestId('agentBuilderConversationStarter')).toHaveLength(2);

    fireEvent.click(screen.getByText('second'));

    expect(onSelect).toHaveBeenCalledWith({ label: 'second' });
  });

  it('labels the group for assistive technology', () => {
    render(<ConversationStartersList starters={[{ label: 'first' }]} onSelect={jest.fn()} />, {
      wrapper,
    });

    expect(screen.getByRole('group', { name: 'Conversation starters' })).toBeInTheDocument();
  });
});
