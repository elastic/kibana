/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

const mockUseAutomaticImportAuthz = jest.fn();
const mockUseAuthz = jest.fn();
jest.mock('../../../../../hooks', () => ({
  useStartServices: () => ({
    application: { navigateToApp: jest.fn(), getUrlForApp: jest.fn(() => '/edit') },
    automaticImport: undefined,
    http: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
    notifications: { toasts: { addSuccess: jest.fn(), addError: jest.fn() } },
    userProfile: { bulkGet: jest.fn().mockResolvedValue([]) },
  }),
  useAuthz: () => mockUseAuthz(),
  useAutomaticImportAuthz: () => mockUseAutomaticImportAuthz(),
}));

jest.mock('../../../../../../../hooks/use_request/epm', () => ({
  useGetPackagesQuery: () => ({ data: { items: [] } }),
}));
jest.mock('../../../../../../../components/package_icon', () => ({
  PackageIcon: () => null,
}));
jest.mock('./manage_integration_actions', () => ({
  ManageIntegrationActions: () => null,
}));
jest.mock('./create_new_integration', () => ({
  CreateNewIntegrationButton: ({
    canCreate,
    canUpload,
  }: {
    canCreate: boolean;
    canUpload: boolean;
  }) => (
    <div
      data-test-subj="createNewIntegrationButtonMock"
      data-can-create={String(canCreate)}
      data-can-upload={String(canUpload)}
    />
  ),
}));

import { ManageIntegrationsTable } from './manage_integrations_table';
import type { CreatedIntegrationRow } from './manage_integrations_table';

const ALL_AUTHZ = {
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canApprove: true,
};
const READ_AUTHZ = {
  canView: true,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,
};

const integrations: CreatedIntegrationRow[] = [
  {
    integrationId: 'my_integration',
    title: 'My integration',
    totalDataStreamCount: 1,
    successfulDataStreamCount: 1,
    version: '1.0.0',
    createdBy: 'elastic',
    status: 'approved',
  },
];

const renderTable = () =>
  render(
    <I18nProvider>
      <QueryClientProvider client={new QueryClient()}>
        <ManageIntegrationsTable
          integrations={integrations}
          isLoading={false}
          isError={false}
          onRefetch={jest.fn()}
          prereleaseIntegrationsEnabled={false}
        />
      </QueryClientProvider>
    </I18nProvider>
  );

const selectFirstRow = () =>
  fireEvent.click(screen.getByTestId('checkboxSelectRow-my_integration'));

const setUploadPackages = (uploadPackages: boolean) =>
  mockUseAuthz.mockReturnValue({ integrations: { uploadPackages } });

describe('ManageIntegrationsTable privilege gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setUploadPackages(false);
  });

  describe('with the Automatic Import "all" privilege', () => {
    beforeEach(() => {
      mockUseAutomaticImportAuthz.mockReturnValue(ALL_AUTHZ);
    });

    it('shows the Create new integration button', () => {
      renderTable();

      expect(screen.getByTestId('createNewIntegrationButtonMock')).toBeInTheDocument();
    });

    it('offers upload in the Create new integration button when the user can upload packages', () => {
      setUploadPackages(true);
      renderTable();

      const button = screen.getByTestId('createNewIntegrationButtonMock');
      expect(button).toHaveAttribute('data-can-create', 'true');
      expect(button).toHaveAttribute('data-can-upload', 'true');
    });

    it('shows the bulk Delete button once rows are selected', () => {
      renderTable();
      selectFirstRow();

      expect(screen.getByTestId('manageIntegrationsBulkDeleteBtn')).toBeInTheDocument();
    });

    it('links the integration title to the edit page', () => {
      renderTable();

      expect(screen.getByRole('link', { name: 'My integration' })).toBeInTheDocument();
    });
  });

  describe('with the Automatic Import "read" privilege', () => {
    beforeEach(() => {
      mockUseAutomaticImportAuthz.mockReturnValue(READ_AUTHZ);
    });

    it('hides the Create new integration button when the user cannot upload packages', () => {
      renderTable();

      expect(screen.queryByTestId('createNewIntegrationButtonMock')).not.toBeInTheDocument();
    });

    it('offers only upload when the user can upload packages', () => {
      setUploadPackages(true);
      renderTable();

      const button = screen.getByTestId('createNewIntegrationButtonMock');
      expect(button).toHaveAttribute('data-can-create', 'false');
      expect(button).toHaveAttribute('data-can-upload', 'true');
    });

    it('hides the bulk Delete button once rows are selected', () => {
      renderTable();
      selectFirstRow();

      expect(screen.queryByTestId('manageIntegrationsBulkDeleteBtn')).not.toBeInTheDocument();
    });

    it('renders the integration title as plain text instead of an edit link', () => {
      renderTable();

      expect(screen.getByText('My integration')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'My integration' })).not.toBeInTheDocument();
    });

    it('keeps the bulk Install button once rows are selected', () => {
      renderTable();
      selectFirstRow();

      expect(screen.getByTestId('manageIntegrationsBulkInstallBtn')).toBeInTheDocument();
    });
  });
});
