/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';
import type { CreateIntegrationSideCardButtonProps } from '@kbn/automatic-import-plugin/public';

import { Sidebar } from './side_bar';

const CreateIntegrationCardButton = () => <div data-test-subj="createIntegrationCard" />;

const renderSidebar = (props: Partial<React.ComponentProps<typeof Sidebar>> = {}) =>
  render(
    <I18nProvider>
      <EuiThemeProvider>
        <Sidebar
          isLoading={false}
          categories={[]}
          selectedCategories={[]}
          onCategoryChange={jest.fn()}
          manageIntegrationsHref="/manage"
          {...props}
        />
      </EuiThemeProvider>
    </I18nProvider>
  );

describe('Sidebar created integrations entry points', () => {
  it('shows the Manage my integrations link to a user who can only view created integrations', () => {
    renderSidebar({
      showCreatedIntegrations: true,
      hasCreatedIntegrations: true,
      createdIntegrationsCount: 2,
      CreateIntegrationCardButton: undefined,
    });

    expect(screen.getByTestId('manageCreatedIntegrationsLink')).toBeInTheDocument();
    expect(screen.getByTestId('manageCreatedIntegrationsCount')).toHaveTextContent('2');
    expect(screen.queryByTestId('createIntegrationCard')).not.toBeInTheDocument();
  });

  it('shows nothing to a view-only user who has no created integrations', () => {
    renderSidebar({
      showCreatedIntegrations: true,
      hasCreatedIntegrations: false,
      CreateIntegrationCardButton: undefined,
    });

    expect(screen.queryByTestId('manageCreatedIntegrationsLink')).not.toBeInTheDocument();
    expect(screen.queryByTestId('createIntegrationCard')).not.toBeInTheDocument();
  });

  it('shows the create card to a user who can create and has no created integrations', () => {
    renderSidebar({
      showCreatedIntegrations: true,
      hasCreatedIntegrations: false,
      CreateIntegrationCardButton,
    });

    expect(screen.getByTestId('createIntegrationCard')).toBeInTheDocument();
    expect(screen.queryByTestId('manageCreatedIntegrationsLink')).not.toBeInTheDocument();
  });

  it('passes the create and upload permissions to the card', () => {
    const CardSpy = jest.fn((_props: CreateIntegrationSideCardButtonProps) => null);
    renderSidebar({
      showCreatedIntegrations: true,
      hasCreatedIntegrations: false,
      CreateIntegrationCardButton: CardSpy,
      canCreateIntegration: false,
      canUploadIntegrationPackage: true,
    });

    expect(CardSpy.mock.calls[0][0]).toEqual({ canCreate: false, canUpload: true });
  });

  it('shows neither entry point when created integrations are not viewable', () => {
    renderSidebar({
      showCreatedIntegrations: false,
      hasCreatedIntegrations: true,
      CreateIntegrationCardButton,
    });

    expect(screen.queryByTestId('manageCreatedIntegrationsLink')).not.toBeInTheDocument();
    expect(screen.queryByTestId('createIntegrationCard')).not.toBeInTheDocument();
  });
});
