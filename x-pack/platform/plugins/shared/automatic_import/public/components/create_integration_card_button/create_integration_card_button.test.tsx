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

const renderComponent = () =>
  render(
    <I18nProvider>
      <CreateIntegrationSideCardButton />
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
