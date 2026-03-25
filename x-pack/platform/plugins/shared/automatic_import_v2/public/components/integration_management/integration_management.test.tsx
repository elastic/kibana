/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import { IntegrationManagement } from './integration_management';

const mockNavigateToApp = jest.fn();
const mockReportCancelButtonClicked = jest.fn();
const mockReportDoneButtonClicked = jest.fn();

jest.mock('../../common', () => ({
  useGetIntegrationById: jest.fn(() => ({
    integration: undefined,
    isLoading: false,
    isError: false,
  })),
  useKibana: () => ({
    services: {
      application: {
        navigateToApp: mockNavigateToApp,
      },
    },
  }),
}));

jest.mock('../telemetry_context', () => ({
  useTelemetry: () => ({
    reportCancelButtonClicked: mockReportCancelButtonClicked,
    reportDoneButtonClicked: mockReportDoneButtonClicked,
  }),
}));

jest.mock('./management_contents/management_contents', () => ({
  ManagementContents: () => <div data-test-subj="managementContentsMock" />,
}));

jest.mock('../../common/components/connector_selector', () => ({
  ConnectorSelector: () => <div data-test-subj="connectorSelectorMock" />,
}));

jest.mock('./forms/integration_form', () => ({
  IntegrationFormProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useIntegrationForm: () => ({ formData: {}, form: {} }),
}));

jest.mock('../../common/components/button_footer', () => ({
  ButtonsFooter: ({
    onAction,
    onCancel,
  }: {
    onAction: () => void;
    onCancel: () => void;
    isActionDisabled: boolean;
  }) => (
    <div>
      <button data-test-subj="doneButton" onClick={onAction}>
        Done
      </button>
      <button data-test-subj="cancelButton" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

const renderComponent = (path = '/create') =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <Route path={['/edit/:integrationId', '/create']}>
          <IntegrationManagement />
        </Route>
      </MemoryRouter>
    </I18nProvider>
  );

describe('IntegrationManagement telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls reportCancelButtonClicked when cancel is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('cancelButton'));

    expect(mockReportCancelButtonClicked).toHaveBeenCalledTimes(1);
  });

  it('calls reportDoneButtonClicked when done is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('doneButton'));

    expect(mockReportDoneButtonClicked).toHaveBeenCalledTimes(1);
  });

  it('navigates away after done is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('doneButton'));

    expect(mockNavigateToApp).toHaveBeenCalledWith('integrations', expect.any(Object));
  });
});
