/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProposedActionStatusBadge } from './needs_review_badge';

describe('ProposedActionStatusBadge', () => {
  it('shows the label and the icon by default', () => {
    const { container } = render(<ProposedActionStatusBadge label="Needs review" />);

    expect(screen.getByText('Needs review')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="eye"]')).toBeInTheDocument();
  });

  it('replaces the icon with a spinner next to the label while loading', () => {
    const { container } = render(<ProposedActionStatusBadge label="Approving" isLoading />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Approving')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="eye"]')).not.toBeInTheDocument();
  });
});
