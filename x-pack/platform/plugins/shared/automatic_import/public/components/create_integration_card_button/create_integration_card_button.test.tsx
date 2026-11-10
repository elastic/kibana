/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { CreateIntegrationSideCardButton } from './create_integration_card_button';
import { AutomaticImportTelemetryEventType } from '../../../common';

const mockNavigateToUrl = jest.fn();
const mockGetUrlForApp = jest.fn(
  (app: string, options?: { path?: string }) => `/${app}${options?.path ?? ''}`
);
const mockReportEvent = jest.fn();

jest.mock('../../common/hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        navigateToUrl: mockNavigateToUrl,
        getUrlForApp: mockGetUrlForApp,
      },
      telemetry: {
        reportEvent: mockReportEvent,
      },
    },
  }),
}));

const renderComponent = ({ canCreate = true, canUpload = true } = {}) =>
  render(
    <I18nProvider>
      <CreateIntegrationSideCardButton canCreate={canCreate} canUpload={canUpload} />
    </I18nProvider>
  );

describe('CreateIntegrationSideCardButton telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls reportEvent with UploadIntegrationClicked when upload link is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('uploadIntegrationPackageLink'));

    expect(mockReportEvent).toHaveBeenCalledWith(
      AutomaticImportTelemetryEventType.UploadIntegrationClicked,
      {}
    );
  });

  it('does not call reportEvent when create integration button is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('createNewIntegrationLink'));

    expect(mockReportEvent).not.toHaveBeenCalled();
  });

  it('navigates to upload path when upload link is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('uploadIntegrationPackageLink'));

    expect(mockNavigateToUrl).toHaveBeenCalledWith('/integrations/upload');
  });
});

describe('CreateIntegrationSideCardButton privileges', () => {
  it('offers both create and upload when the user can do both', () => {
    renderComponent();

    expect(screen.getByTestId('createNewIntegrationLink')).toBeInTheDocument();
    expect(screen.getByTestId('uploadIntegrationPackageLink')).toBeInTheDocument();
  });

  it('offers only the upload link when the user can upload but not create', () => {
    renderComponent({ canCreate: false });

    expect(screen.queryByTestId('createNewIntegrationLink')).not.toBeInTheDocument();
    expect(screen.getByTestId('uploadIntegrationPackageLink')).toBeInTheDocument();
    expect(screen.queryByText(/Use AI/)).not.toBeInTheDocument();
  });

  it('offers only the create button when the user can create but not upload', () => {
    renderComponent({ canUpload: false });

    expect(screen.getByTestId('createNewIntegrationLink')).toBeInTheDocument();
    expect(screen.queryByTestId('uploadIntegrationPackageLink')).not.toBeInTheDocument();
  });

  it('renders nothing when the user can neither create nor upload', () => {
    renderComponent({ canCreate: false, canUpload: false });

    expect(screen.queryByTestId('createIntegrationCardButton')).not.toBeInTheDocument();
  });
});
