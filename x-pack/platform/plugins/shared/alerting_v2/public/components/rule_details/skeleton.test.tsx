/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { ListPageTestProviders } from '../../test_utils/test_providers';
import { Skeleton } from './skeleton';

const renderSkeleton = () =>
  render(
    <ListPageTestProviders>
      <Skeleton />
    </ListPageTestProviders>
  );

describe('Skeleton', () => {
  it('renders without crashing', () => {
    const { container } = renderSkeleton();
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the app header loading placeholder with a back link to the rules list', () => {
    renderSkeleton();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.skeleton)).toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute(
      'href',
      '/mock-locator-url'
    );
  });
});
