/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ApprovalProposal } from './types';
import { ProposalCaption } from './proposal_caption';

const proposal = (overrides: Partial<ApprovalProposal>): ApprovalProposal =>
  ({ title: 'Do something', comment: 'Do it.', ...overrides } as ApprovalProposal);

describe('ProposalCaption', () => {
  it('shows the same text as the plain caption line', () => {
    const { container } = render(
      <ProposalCaption
        proposal={proposal({ category: 'investigate', action: { reversible: false } as never })}
      />
    );

    expect(container).toHaveTextContent('Investigate • Irreversible');
  });

  it('shows only "Irreversible" in the danger color', () => {
    render(
      <ProposalCaption
        proposal={proposal({ category: 'respond', action: { reversible: false } as never })}
      />
    );

    const irreversible = screen.getByText('Irreversible');
    expect(irreversible.className).toMatch(/danger/i);
    expect(screen.getByText(/Respond/).className).not.toMatch(/danger/i);
  });

  it('does not highlight a reversible action', () => {
    render(
      <ProposalCaption
        proposal={proposal({ category: 'respond', action: { reversible: true } as never })}
      />
    );

    expect(screen.getByText(/Reversible/).className).not.toMatch(/danger/i);
  });

  it('shows nothing when the proposal has no category and no reversibility', () => {
    const { container } = render(<ProposalCaption proposal={proposal({})} />);

    expect(container).toBeEmptyDOMElement();
  });
});
