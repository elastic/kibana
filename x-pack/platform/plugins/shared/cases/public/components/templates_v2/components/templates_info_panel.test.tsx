/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { TemplatesInfoPanel } from './templates_info_panel';
import { renderWithTestingProviders } from '../../../common/mock';

describe('TemplatesInfoPanel', () => {
  it('renders correctly', async () => {
    renderWithTestingProviders(<TemplatesInfoPanel />);

    expect(await screen.findByTestId('templates-info-panel')).toBeInTheDocument();
  });

  it('renders the title', async () => {
    renderWithTestingProviders(<TemplatesInfoPanel />);

    expect(await screen.findByText('Create custom templates for your needs')).toBeInTheDocument();
  });

  it('renders the description', async () => {
    renderWithTestingProviders(<TemplatesInfoPanel />);

    expect(
      await screen.findByText(
        'Create templates with custom set of fields, that can automatically populate values in new cases.'
      )
    ).toBeInTheDocument();
  });

  it('renders the learn more link', async () => {
    renderWithTestingProviders(<TemplatesInfoPanel />);

    expect(await screen.findByText('Learn more')).toBeInTheDocument();
  });

  it('points the learn more link at the manage-case-templates doc', async () => {
    renderWithTestingProviders(<TemplatesInfoPanel />);

    const link = await screen.findByRole('link', { name: /Learn more/ });
    expect(link).toHaveAttribute('href', expect.stringContaining('cases/manage-case-templates'));
  });

  it('renders the illustration', async () => {
    renderWithTestingProviders(<TemplatesInfoPanel />);

    expect(await screen.findByTestId('templates-info-panel-illustration')).toBeInTheDocument();
  });
});
