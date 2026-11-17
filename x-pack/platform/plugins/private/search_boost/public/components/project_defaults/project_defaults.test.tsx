/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { ProjectDefaultsProps } from './project_defaults';
import { ProjectDefaults } from './project_defaults';

const defaultProps: ProjectDefaultsProps = {
  canEdit: true,
  indices: {
    ruleName: '_default_indices',
    profile: {
      kind: 'managed',
      name: 'default_indices',
      label: 'Performant',
      description:
        'Consistently low average latency, scaling to high query throughput as load grows.',
    },
    matches: [
      { name: 'products', isHidden: false },
      { name: 'users', isHidden: false },
    ],
  },
  dataStreams: {
    ruleName: '_default_data_streams',
    profile: {
      kind: 'managed',
      name: 'default_data_streams_7d',
      label: 'Last 7 days',
      description: 'The most recent week of each data stream is kept search-ready.',
    },
    matches: [
      { name: 'logs-nginx-default', isHidden: false, outrankedByRuleName: 'web-logs' },
      { name: 'metrics-system-default', isHidden: false },
      { name: '.hidden-1', isHidden: true },
    ],
  },
  onEdit: jest.fn(),
  onViewProfile: jest.fn(),
};

describe('ProjectDefaults', () => {
  it('shows the title and the indices card before the data streams card', () => {
    render(<ProjectDefaults {...defaultProps} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Project defaults' })).toBeInTheDocument();
    expect(
      screen
        .getAllByTestId(/^searchBoostProjectDefault-(indices|data_streams)$/)
        .map((card) => card.getAttribute('data-test-subj'))
    ).toEqual(['searchBoostProjectDefault-indices', 'searchBoostProjectDefault-data_streams']);
  });

  it('passes each type its own data', () => {
    render(<ProjectDefaults {...defaultProps} />);

    expect(screen.getByTestId('searchBoostProjectDefaultValue-indices')).toHaveTextContent(
      'Performant'
    );
    expect(screen.getByTestId('searchBoostProjectDefaultValue-data_streams')).toHaveTextContent(
      'Last 7 days'
    );
    expect(screen.getByTestId('searchBoostProjectDefaultCount-indices')).toHaveTextContent(
      '2 indices'
    );
    expect(screen.getByTestId('searchBoostProjectDefaultCount-data_streams')).toHaveTextContent(
      '3 data streams'
    );
  });

  it('calls onEdit with the type of the card that was edited', async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    render(<ProjectDefaults {...defaultProps} onEdit={onEdit} />);

    await user.click(screen.getByTestId('searchBoostEditProjectDefault-indices'));
    await user.click(screen.getByTestId('searchBoostEditProjectDefault-data_streams'));

    expect(onEdit.mock.calls).toEqual([['indices'], ['data_streams']]);
  });
});
