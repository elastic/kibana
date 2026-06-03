/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CapabilityCard } from './capability_card';

describe('CapabilityCard', () => {
  it('renders populated state with count in footer', () => {
    render(
      <CapabilityCard
        dataTestSubj="testCapabilityCard"
        count={3}
        title="Skills"
        description="Functional copy when items exist."
        emptyDescription="Onboarding copy."
      />
    );

    expect(screen.getByTestId('testCapabilityCard')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Skills' })).toBeInTheDocument();
    expect(screen.getByText('Functional copy when items exist.')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders zero state with empty description and image', () => {
    const { container } = render(
      <CapabilityCard
        dataTestSubj="testCapabilityCardZero"
        count={0}
        title="Skills"
        description="Functional copy."
        emptyDescription="No skills yet — add from the library."
        image="https://example.com/skill.svg"
      />
    );

    expect(screen.getByText('No skills yet — add from the library.')).toBeInTheDocument();
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img).toHaveAttribute('src', 'https://example.com/skill.svg');
  });

  it('renders loading state with skeleton and spinner', () => {
    render(
      <CapabilityCard
        dataTestSubj="testCapabilityCardLoading"
        count={0}
        title="Tools"
        description="Desc"
        emptyDescription="Empty"
        isCountLoading={true}
      />
    );

    const card = screen.getByTestId('testCapabilityCardLoading');
    expect(card).toHaveAttribute('aria-busy', 'true');
    expect(card.querySelector('.euiSkeletonText')).toBeTruthy();
    expect(card.querySelector('.euiLoadingSpinner')).toBeTruthy();
  });

  it('invokes onClick when populated card is activated', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <CapabilityCard
        count={2}
        title="Tools"
        description="Desc"
        emptyDescription="Empty"
        href="#tools"
        onClick={onClick}
      />
    );

    await user.click(screen.getByRole('link'));
    expect(onClick).toHaveBeenCalled();
  });
});
