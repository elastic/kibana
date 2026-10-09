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
import type { HypothesisTreeInput } from './build_hypothesis_graph';
import { HypothesisTreeCard } from './hypothesis_tree_card';

jest.mock('./hypothesis_tree_flyout', () => ({
  HypothesisTreeFlyout: ({
    input,
    onClose,
  }: {
    input: HypothesisTreeInput;
    onClose: () => void;
  }) => (
    <div data-test-subj="mockHypothesisTreeFlyout">
      {input.hypotheses.length}
      <button type="button" onClick={onClose}>
        close
      </button>
    </div>
  ),
}));

const input: HypothesisTreeInput = {
  id: 'conv-1',
  title: 'Checkout latency spike',
  subjects: [],
  hypotheses: [
    { candidate: 'Bad deploy', confidence: 0.9, status: 'confirmed' },
    { candidate: 'Network', confidence: 0.1, status: 'dismissed' },
  ],
  proposals: [],
  isRunning: false,
};

const renderCard = (overrides: Partial<HypothesisTreeInput> = {}) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <HypothesisTreeCard input={{ ...input, ...overrides }} />
      </I18nProvider>
    </EuiProvider>
  );

describe('HypothesisTreeCard', () => {
  it('says how many hypotheses were analyzed', () => {
    renderCard();

    expect(screen.getByTestId('investigationHypothesisTreeButton')).toHaveTextContent(
      'View hypothesis tree2 hypotheses analyzed'
    );
    expect(screen.queryByTestId('investigationHypothesisTreeCardTypingDots')).toBeNull();
  });

  it('shows that the agent is still working while the investigation runs', () => {
    renderCard({ isRunning: true });

    expect(screen.getByTestId('investigationHypothesisTreeCardTypingDots')).toBeInTheDocument();
  });

  it('opens and closes the tree flyout', async () => {
    renderCard();

    fireEvent.click(screen.getByTestId('investigationHypothesisTreeButton'));
    expect(await screen.findByTestId('mockHypothesisTreeFlyout')).toHaveTextContent('2');

    fireEvent.click(screen.getByText('close'));
    expect(screen.queryByTestId('mockHypothesisTreeFlyout')).toBeNull();
  });
});
