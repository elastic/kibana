/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { AboutCard } from './about_card';
import { TestProviders } from '../../../actions/__test_helpers__/mock_data';

const renderWithProviders = (element: React.ReactElement) =>
  render(element, { wrapper: TestProviders });

describe('AboutCard', () => {
  it('renders title and description list items', () => {
    renderWithProviders(
      <AboutCard
        title="Test Card"
        items={[
          { title: 'Label 1', description: 'Value 1' },
          { title: 'Label 2', description: 'Value 2' },
        ]}
        data-test-subj="test-card"
      />
    );

    expect(screen.getByTestId('test-card')).toBeInTheDocument();
    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Label 1')).toBeInTheDocument();
    expect(screen.getByText('Value 1')).toBeInTheDocument();
    expect(screen.getByText('Label 2')).toBeInTheDocument();
    expect(screen.getByText('Value 2')).toBeInTheDocument();
  });

  it('renders ReactNode descriptions', () => {
    renderWithProviders(
      <AboutCard
        title="Card"
        items={[
          {
            title: 'Status',
            description: <span data-test-subj="custom-node">Active</span>,
          },
        ]}
      />
    );

    expect(screen.getByTestId('custom-node')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders titleExtra when provided', () => {
    renderWithProviders(
      <AboutCard
        title="Tags"
        items={[{ title: 'Count', description: '3' }]}
        titleExtra={<button data-test-subj="edit-btn">Edit</button>}
      />
    );

    expect(screen.getByTestId('edit-btn')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });
});
