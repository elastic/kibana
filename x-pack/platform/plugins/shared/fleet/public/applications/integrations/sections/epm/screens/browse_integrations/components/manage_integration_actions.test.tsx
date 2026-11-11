/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

const mockUseAutomaticImportAuthz = jest.fn();
const mockUseAuthz = jest.fn();
jest.mock('../../../../../hooks', () => ({
  useStartServices: () => ({ automaticImport: undefined }),
  useAutomaticImportAuthz: () => mockUseAutomaticImportAuthz(),
  useAuthz: () => mockUseAuthz(),
}));

jest.mock('./review_approve_modal', () => ({
  ReviewApproveModal: () => null,
}));

import { ManageIntegrationActions } from './manage_integration_actions';
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

const integration: CreatedIntegrationRow = {
  integrationId: 'my_integration',
  title: 'My integration',
  totalDataStreamCount: 1,
  successfulDataStreamCount: 1,
  version: '1.0.0',
  createdBy: 'elastic',
  status: 'completed',
};

const renderActions = (
  props: Partial<React.ComponentProps<typeof ManageIntegrationActions>> = {}
) =>
  render(
    <I18nProvider>
      <ManageIntegrationActions
        integration={integration}
        isPackageReady={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onFetchReviewDetails={jest.fn()}
        onApproveAndInstall={jest.fn()}
        onDownloadZip={jest.fn()}
        onInstallToCluster={jest.fn()}
        {...props}
      />
    </I18nProvider>
  );

const openMenu = () => fireEvent.click(screen.getByTestId('manageIntegrationActionsBtn'));

beforeEach(() => {
  mockUseAuthz.mockReturnValue({ integrations: { installPackages: true } });
});

describe('ManageIntegrationActions install privilege', () => {
  const approvedIntegration: CreatedIntegrationRow = { ...integration, status: 'approved' };

  beforeEach(() => {
    mockUseAutomaticImportAuthz.mockReturnValue(ALL_AUTHZ);
  });

  it('enables Install for an approved integration when the user can install packages', () => {
    renderActions({ integration: approvedIntegration });
    openMenu();

    expect(screen.getByTestId('manageIntegrationInstallMenuItem')).toBeEnabled();
  });

  it('disables Install when the user cannot install packages', () => {
    mockUseAuthz.mockReturnValue({ integrations: { installPackages: false } });

    renderActions({ integration: approvedIntegration });
    openMenu();

    expect(screen.getByTestId('manageIntegrationInstallMenuItem')).toBeDisabled();
  });
});

describe('ManageIntegrationActions privilege gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with the Automatic Import "all" privilege', () => {
    beforeEach(() => {
      mockUseAutomaticImportAuthz.mockReturnValue(ALL_AUTHZ);
    });

    it('shows the Review & Approve, Edit and Delete menu items', () => {
      renderActions();
      openMenu();

      expect(screen.getByTestId('manageIntegrationReviewApproveMenuItem')).toBeInTheDocument();
      expect(screen.getByTestId('manageIntegrationEditMenuItem')).toBeInTheDocument();
      expect(screen.getByTestId('manageIntegrationDeleteMenuItem')).toBeInTheDocument();
    });

    it('shows the inline Review & approve button', () => {
      renderActions({ inlineActionType: 'reviewApprove', showMenuButton: false });

      expect(screen.getByTestId('manageIntegrationReviewApproveInlineBtn')).toBeInTheDocument();
    });

    it('does not offer the read-only View results entries', () => {
      renderActions({ inlineActionType: 'reviewApprove' });
      openMenu();

      expect(screen.queryByTestId('manageIntegrationViewResultsMenuItem')).not.toBeInTheDocument();
      expect(screen.queryByTestId('manageIntegrationViewResultsInlineBtn')).not.toBeInTheDocument();
    });
  });

  describe('with the Automatic Import "read" privilege', () => {
    beforeEach(() => {
      mockUseAutomaticImportAuthz.mockReturnValue(READ_AUTHZ);
    });

    it('keeps the Download .zip package menu item', () => {
      renderActions();
      openMenu();

      expect(screen.getByTestId('manageIntegrationDownloadZipMenuItem')).toBeInTheDocument();
    });

    it('hides the Edit and Delete menu items', () => {
      renderActions();
      openMenu();

      expect(screen.queryByTestId('manageIntegrationEditMenuItem')).not.toBeInTheDocument();
      expect(screen.queryByTestId('manageIntegrationDeleteMenuItem')).not.toBeInTheDocument();
    });

    it('hides the Review & Approve menu item', () => {
      renderActions();
      openMenu();

      expect(
        screen.queryByTestId('manageIntegrationReviewApproveMenuItem')
      ).not.toBeInTheDocument();
    });

    it('hides the inline Review & approve button', () => {
      renderActions({ inlineActionType: 'reviewApprove', showMenuButton: false });

      expect(
        screen.queryByTestId('manageIntegrationReviewApproveInlineBtn')
      ).not.toBeInTheDocument();
    });

    it('offers a View results menu item instead of Review & Approve', () => {
      renderActions();
      openMenu();

      expect(screen.getByTestId('manageIntegrationViewResultsMenuItem')).toBeInTheDocument();
    });

    it('offers an inline View results button instead of Review & approve', () => {
      renderActions({ inlineActionType: 'reviewApprove', showMenuButton: false });

      expect(screen.getByTestId('manageIntegrationViewResultsInlineBtn')).toBeInTheDocument();
    });

    it('keeps View results enabled while some data streams are still processing', () => {
      renderActions({
        isPackageReady: false,
        integration: {
          ...integration,
          status: 'processing',
          totalDataStreamCount: 2,
          successfulDataStreamCount: 1,
        },
      });
      openMenu();

      expect(screen.getByTestId('manageIntegrationViewResultsMenuItem')).toBeEnabled();
    });

    it('disables View results when the integration has no data streams', () => {
      renderActions({
        isPackageReady: false,
        integration: { ...integration, totalDataStreamCount: 0, successfulDataStreamCount: 0 },
      });
      openMenu();

      expect(screen.getByTestId('manageIntegrationViewResultsMenuItem')).toBeDisabled();
    });

    it('hides the inline Edit Integration button', () => {
      renderActions({ inlineActionType: 'editIntegration', showMenuButton: false });

      expect(screen.queryByRole('button', { name: 'Edit Integration' })).not.toBeInTheDocument();
    });
  });
});
