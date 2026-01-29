/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { TemplatesListHeader } from './templates_list_header';
import { renderWithTestingProviders } from '../../../common/mock';

describe('TemplatesListHeader', () => {
  it('renders correctly', async () => {
    renderWithTestingProviders(<TemplatesListHeader />);

    expect(await screen.findByTestId('all-templates-header')).toBeInTheDocument();
  });

  it('renders the templates title', async () => {
    renderWithTestingProviders(<TemplatesListHeader />);

    expect(await screen.findByText('Templates')).toBeInTheDocument();
  });

  it('renders the import template button', async () => {
    renderWithTestingProviders(<TemplatesListHeader />);

    expect(await screen.findByTestId('import-template-button')).toBeInTheDocument();
    expect(screen.getByText('Import template')).toBeInTheDocument();
  });

  it('renders the create template button', async () => {
    renderWithTestingProviders(<TemplatesListHeader />);

    expect(await screen.findByTestId('create-template-button')).toBeInTheDocument();
    expect(screen.getByText('Create template')).toBeInTheDocument();
  });
});
