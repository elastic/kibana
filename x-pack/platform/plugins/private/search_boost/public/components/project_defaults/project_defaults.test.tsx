/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { ProjectDefaultsProps } from './project_defaults';
import { ProjectDefaults } from './project_defaults';

const defaultProps: ProjectDefaultsProps = {
  canEdit: true,
  indices: {
    ruleName: 'default_indices',
    profile: { name: 'default_indices', is_builtin: true },
    matches: [{ name: 'products' }, { name: 'users' }],
  },
  dataStreams: {
    ruleName: 'default_data_streams',
    profile: { name: 'default_data_streams_7d', is_builtin: true },
    matches: [
      { name: 'logs-nginx-default', outrankedByRuleName: 'web-logs' },
      { name: 'metrics-system-default' },
      { name: '.hidden-1' },
    ],
  },
  onEdit: jest.fn(),
  getProfileLinkProps: () => ({ href: '#', onClick: jest.fn() }),
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

  it('shows an empty card in place of a type it has no data for', () => {
    render(<ProjectDefaults {...defaultProps} indices={undefined} />);

    const emptyCard = screen.getByTestId('searchBoostProjectDefaultEmpty-indices');
    expect(
      within(emptyCard).getByRole('heading', { level: 3, name: 'Indices' })
    ).toBeInTheDocument();
    expect(emptyCard).toHaveTextContent('No default boost profile found.');
    expect(screen.queryByTestId('searchBoostProjectDefault-indices')).not.toBeInTheDocument();
    expect(screen.queryByTestId('searchBoostEditProjectDefault-indices')).not.toBeInTheDocument();
    // The empty card keeps its place before the data streams card.
    expect(
      emptyCard.compareDocumentPosition(
        screen.getByTestId('searchBoostProjectDefault-data_streams')
      )
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('shows the title and both empty cards when it has no data for either type', () => {
    render(<ProjectDefaults canEdit />);

    expect(screen.getByRole('heading', { level: 2, name: 'Project defaults' })).toBeInTheDocument();
    expect(
      screen
        .getAllByTestId(/^searchBoostProjectDefaultEmpty-/)
        .map((card) => card.getAttribute('data-test-subj'))
    ).toEqual([
      'searchBoostProjectDefaultEmpty-indices',
      'searchBoostProjectDefaultEmpty-data_streams',
    ]);
    expect(
      screen.queryByTestId(/^searchBoostProjectDefault-(indices|data_streams)$/)
    ).not.toBeInTheDocument();
  });

  it('passes each type its own data', () => {
    render(<ProjectDefaults {...defaultProps} />);

    expect(screen.getByTestId('searchBoostProjectDefaultValue-indices')).toHaveTextContent(
      'Default'
    );
    expect(screen.getByTestId('searchBoostProjectDefaultValue-data_streams')).toHaveTextContent(
      'Last 7 days'
    );
    expect(screen.getByTestId('searchBoostProjectDefaultCount-indices')).toHaveTextContent(
      '2 indices'
    );
    expect(screen.getByTestId('searchBoostProjectDefaultCount-data_streams')).toHaveTextContent(
      '2 data streams'
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

  it('shows no Edit button when onEdit is omitted', () => {
    render(<ProjectDefaults {...defaultProps} onEdit={undefined} />);

    expect(screen.queryByTestId(/^searchBoostEditProjectDefault-/)).not.toBeInTheDocument();
  });
});
