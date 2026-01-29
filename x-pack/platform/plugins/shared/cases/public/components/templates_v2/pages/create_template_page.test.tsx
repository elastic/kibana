/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { CreateTemplatePage } from './create_template_page';
import { renderWithTestingProviders } from '../../../common/mock';

describe('CreateTemplatePage', () => {
  it('renders correctly with default label', async () => {
    renderWithTestingProviders(<CreateTemplatePage />);

    expect(screen.getByTestId('header-page-title')).toHaveTextContent('Create Template Page');
  });

  it('renders correctly with custom label', async () => {
    renderWithTestingProviders(<CreateTemplatePage label="Custom Label" />);

    expect(screen.getByTestId('header-page-title')).toHaveTextContent('Custom Label');
  });
});
