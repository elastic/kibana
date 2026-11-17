/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { SearchBoostPage } from './search_boost_page';

describe('SearchBoostPage', () => {
  it('shows the title and description', () => {
    render(
      <MockAppHeaderProvider>
        <SearchBoostPage />
      </MockAppHeaderProvider>
    );

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Search boost');
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.description)).toHaveTextContent(
      'Balance search performance and cost for the indices and data streams in this project.'
    );
  });
});
