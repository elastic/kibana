/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { Investigation } from '../../types';
import { ConversationCard } from './conversation_card';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>
    <EuiProvider>{children}</EuiProvider>
  </I18nProvider>
);

const investigation: Investigation = {
  id: 'inv-1',
  template_id: 'investigation',
  title: 'Impossible travel — exec account',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  watch_id: 'watch-1',
  watch_execution_id: 'exec-1',
  pendingProposalCount: 0,
  events: [],
};

const renderCard = (isSelected?: boolean, onClickCard = jest.fn()) => {
  render(
    <ConversationCard
      investigation={investigation}
      hasBorder={false}
      isSelected={isSelected}
      onClickCard={onClickCard}
      onClickAction={jest.fn()}
      onClickRecommendedAction={jest.fn()}
    />,
    { wrapper }
  );
  return { onClickCard };
};

describe('ConversationCard', () => {
  it('emits the conversation id on click so the caller can open the details flyout', () => {
    const { onClickCard } = renderCard();

    fireEvent.click(screen.getByRole('button', { name: investigation.title }));

    expect(onClickCard).toHaveBeenCalledWith('inv-1');
  });

  it('marks the card as current while its flyout is open', () => {
    renderCard(true);

    expect(screen.getByRole('button', { name: investigation.title })).toHaveAttribute(
      'aria-current',
      'true'
    );
  });

  it('is not marked as current otherwise', () => {
    renderCard(false);

    expect(screen.getByRole('button', { name: investigation.title })).not.toHaveAttribute(
      'aria-current'
    );
  });
});
