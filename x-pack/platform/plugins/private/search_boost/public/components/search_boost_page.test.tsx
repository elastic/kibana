/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SearchBoostPage } from './search_boost_page';

// The page header lives in Kibana's chrome, so a stand-in renders the props it receives.
jest.mock('@kbn/app-header', () => {
  const { createElement } = jest.requireActual('react');
  return {
    AppHeader: ({ title, description }: { title: string; description: string }) =>
      createElement(
        'div',
        null,
        createElement('h1', null, title),
        createElement('p', { 'data-test-subj': 'appHeaderDescription' }, description)
      ),
  };
});

describe('SearchBoostPage', () => {
  it('shows the title and description', () => {
    render(<SearchBoostPage />);

    expect(screen.getByRole('heading', { name: 'Search boost' })).toBeInTheDocument();
    expect(screen.getByTestId('appHeaderDescription')).toHaveTextContent(
      'Balance search performance and cost for the indices and data streams in this project.'
    );
  });
});
