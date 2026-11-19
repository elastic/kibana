/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { ProjectDefaultCardProps } from './project_default_card';
import { ProjectDefaultCard } from './project_default_card';

const defaultProps: ProjectDefaultCardProps = {
  type: 'indices',
  ruleName: 'default_indices',
  profile: { name: 'default_indices', is_builtin: true },
  matches: [
    { name: 'products', isHidden: false },
    { name: 'users', isHidden: false },
  ],
  canEdit: true,
  onEdit: jest.fn(),
  onViewProfile: jest.fn(),
};

describe('ProjectDefaultCard', () => {
  it('shows the managed profile label, description, and count', () => {
    render(<ProjectDefaultCard {...defaultProps} />);

    expect(screen.getByTestId('searchBoostProjectDefaultValue-indices')).toHaveTextContent(
      'Performant'
    );
    expect(
      screen.getByText(
        'Consistently low average latency, scaling to high query throughput as load grows.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('searchBoostProjectDefaultCount-indices')).toHaveTextContent(
      '2 indices'
    );
  });

  it('counts only the matches the rule applies to, leaving out outranked ones', () => {
    render(
      <ProjectDefaultCard
        {...defaultProps}
        matches={[
          { name: 'products', isHidden: false },
          { name: 'users', isHidden: false },
          { name: 'archive', isHidden: false, outrankedByRuleName: 'Product catalog' },
        ]}
      />
    );

    expect(
      screen.getByRole('button', { name: '2 indices. Show what the default for indices matches' })
    ).toBeInTheDocument();
  });

  it('shows the name without a description for a built-in profile with no managed text', () => {
    render(
      <ProjectDefaultCard
        {...defaultProps}
        profile={{ name: '_converted_indices', is_builtin: true }}
      />
    );

    expect(screen.getByTestId('searchBoostProjectDefaultValue-indices')).toHaveTextContent(
      '_converted_indices'
    );
    expect(screen.queryByText('Using a selected custom boost profile.')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('searchBoostProjectDefaultProfileLink-indices')
    ).not.toBeInTheDocument();
  });

  it('shows Edit when canEdit is true and calls onEdit', async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    render(<ProjectDefaultCard {...defaultProps} onEdit={onEdit} />);

    await user.click(screen.getByTestId('searchBoostEditProjectDefault-indices'));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('hides Edit when canEdit is false', () => {
    render(<ProjectDefaultCard {...defaultProps} canEdit={false} />);

    expect(screen.queryByTestId('searchBoostEditProjectDefault-indices')).not.toBeInTheDocument();
  });

  it('shows a custom profile name, description, and view link', async () => {
    const user = userEvent.setup();
    const onViewProfile = jest.fn();
    render(
      <ProjectDefaultCard
        {...defaultProps}
        profile={{ name: 'catalog-fast', is_builtin: false }}
        onViewProfile={onViewProfile}
      />
    );

    expect(screen.getByTestId('searchBoostProjectDefaultValue-indices')).toHaveTextContent(
      'catalog-fast'
    );
    expect(screen.getByText('Using a selected custom boost profile.')).toBeInTheDocument();

    await user.click(screen.getByTestId('searchBoostProjectDefaultProfileLink-indices'));

    expect(onViewProfile).toHaveBeenCalledWith('catalog-fast');
  });

  it('does not show the custom profile link when onViewProfile is omitted', () => {
    render(
      <ProjectDefaultCard
        {...defaultProps}
        profile={{ name: 'catalog-fast', is_builtin: false }}
        onViewProfile={undefined}
      />
    );

    expect(screen.getByTestId('searchBoostProjectDefaultValue-indices')).toHaveTextContent(
      'catalog-fast'
    );
    expect(
      screen.queryByTestId('searchBoostProjectDefaultProfileLink-indices')
    ).not.toBeInTheDocument();
  });

  it('opens the matches popover from the count badge', async () => {
    const user = userEvent.setup();
    render(<ProjectDefaultCard {...defaultProps} />);

    await user.click(screen.getByTestId('searchBoostProjectDefaultCount-indices'));

    expect(screen.getByText('Matching indices')).toBeInTheDocument();
    expect(screen.getByText('products')).toBeInTheDocument();
  });

  it('does not make the count badge open a popover when there are no matches', () => {
    render(<ProjectDefaultCard {...defaultProps} matches={[]} />);

    const badge = screen.getByTestId('searchBoostProjectDefaultCount-indices');
    expect(badge).toHaveTextContent('0 indices');
    expect(badge.tagName).toBe('SPAN');
    expect(screen.queryByTestId('searchBoostMatchesPopover')).not.toBeInTheDocument();
  });

  it.each([
    ['indices', 'About the default for indices'],
    ['data_streams', 'About the default for data streams'],
  ] as const)('exposes the about tip for %s with the expected label', (type, label) => {
    render(<ProjectDefaultCard {...defaultProps} type={type} />);

    expect(screen.getByTestId(`searchBoostProjectDefaultRuleTip-${type}`)).toHaveTextContent(label);
  });
});
