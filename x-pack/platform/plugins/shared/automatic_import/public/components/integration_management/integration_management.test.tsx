/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import { IntegrationManagement } from './integration_management';
import { AutomaticImportTelemetryEventType } from '../../../common/telemetry/types';

const mockNavigateToApp = jest.fn();
const mockNavigateToUrl = jest.fn();
const mockGetUrlForApp = jest.fn(() => '/mock-integrations-url');
const mockReportCancelButtonClicked = jest.fn();
const mockReportDoneButtonClicked = jest.fn();
const mockReportEvent = jest.fn();
const mockUseGetIntegrationById = jest.fn();
const mockDeleteIntegrationMutateAsync = jest.fn().mockResolvedValue(undefined);
const mockCreateUpdateIntegrationMutateAsync = jest.fn().mockResolvedValue(undefined);
const mockSubmit = jest.fn();

const mockEnterpriseLicense = {
  isAvailable: true,
  isActive: true,
  hasAtLeast: (licenseType: string) => licenseType === 'enterprise',
};

const mockLicense$ = new BehaviorSubject(mockEnterpriseLicense);

jest.mock('react-use/lib/useObservable', () => ({
  __esModule: true,
  default: (obs$: { getValue?: () => unknown }) =>
    typeof obs$?.getValue === 'function' ? obs$.getValue() : undefined,
}));

const mockAutomaticImportCapabilities = {
  view: true,
  create: true,
  edit: true,
  delete: true,
  approve: true,
};

const mockServices = {
  application: {
    navigateToApp: mockNavigateToApp,
    getUrlForApp: mockGetUrlForApp,
    navigateToUrl: mockNavigateToUrl,
    capabilities: { automatic_import: mockAutomaticImportCapabilities },
  },
  licensing: {
    license$: mockLicense$,
  },
  telemetry: {
    reportEvent: mockReportEvent,
  },
};

jest.mock('../../common/hooks/use_kibana', () => ({
  useKibana: () => ({ services: mockServices }),
}));

jest.mock('../../common', () => ({
  useGetIntegrationById: (integrationId: string | undefined) =>
    mockUseGetIntegrationById(integrationId),
  useDeleteIntegration: () => ({
    deleteIntegrationMutation: {
      mutateAsync: mockDeleteIntegrationMutateAsync,
      isLoading: false,
    },
  }),
  useCreateUpdateIntegration: () => ({
    createUpdateIntegrationMutation: {
      mutateAsync: mockCreateUpdateIntegrationMutateAsync,
      isLoading: false,
    },
  }),
  useKibana: () => ({ services: mockServices }),
}));

jest.mock('../telemetry_context', () => ({
  useTelemetry: () => ({
    sessionId: 'test-session-id',
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
  useIntegrationForm: () => ({ formData: {}, form: {}, submit: mockSubmit, isFormModified: true }),
}));

jest.mock('../../common/components/button_footer', () => ({
  ButtonsFooter: ({
    onAction,
    onCancel,
    isActionDisabled,
  }: {
    onAction: () => void;
    onCancel: () => void;
    isActionDisabled?: boolean;
  }) => (
    <div>
      <button
        type="button"
        data-test-subj="doneButton"
        onClick={onAction}
        disabled={Boolean(isActionDisabled)}
      >
        {'Done'}
      </button>
      <button type="button" data-test-subj="cancelButton" onClick={onCancel}>
        {'Cancel'}
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
    mockUseGetIntegrationById.mockReturnValue({
      integration: undefined,
      isLoading: false,
      isError: false,
    });
  });

  it('calls reportCancelButtonClicked and navigates to manage integrations when cancel is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('cancelButton'));

    expect(mockReportCancelButtonClicked).toHaveBeenCalledTimes(1);
    expect(mockNavigateToApp).toHaveBeenCalledWith('integrations', {
      path: '/browse?view=manage',
    });
  });

  it('calls reportDoneButtonClicked when done is clicked', () => {
    mockUseGetIntegrationById.mockReturnValue({
      integration: {
        integrationId: 'int-1',
        title: 'With streams',
        description: 'd',
        status: 'completed',
        dataStreams: [
          {
            dataStreamId: 'ds-1',
            title: 'Logs',
            description: 'L',
            inputTypes: [{ name: 'filestream' }],
            status: 'completed',
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    renderComponent('/edit/int-1');

    fireEvent.click(screen.getByTestId('doneButton'));

    expect(mockReportDoneButtonClicked).toHaveBeenCalledTimes(1);
  });

  it('calls submit when done is clicked', () => {
    mockUseGetIntegrationById.mockReturnValue({
      integration: {
        integrationId: 'int-1',
        title: 'With streams',
        description: 'd',
        status: 'completed',
        dataStreams: [
          {
            dataStreamId: 'ds-1',
            title: 'Logs',
            description: 'L',
            inputTypes: [{ name: 'filestream' }],
            status: 'completed',
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    renderComponent('/edit/int-1');

    fireEvent.click(screen.getByTestId('doneButton'));

    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });

  it('navigates to manage integrations when cancel is clicked on edit route with data streams', () => {
    mockUseGetIntegrationById.mockReturnValue({
      integration: {
        integrationId: 'int-1',
        title: 'With streams',
        description: 'd',
        status: 'completed',
        dataStreams: [
          {
            dataStreamId: 'ds-1',
            title: 'Logs',
            description: 'L',
            inputTypes: [{ name: 'filestream' }],
            status: 'completed',
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    renderComponent('/edit/int-1');

    fireEvent.click(screen.getByTestId('cancelButton'));

    expect(mockReportCancelButtonClicked).toHaveBeenCalledTimes(1);
    expect(mockNavigateToApp).toHaveBeenCalledWith('integrations', {
      path: '/browse?view=manage',
    });
  });

  it('opens delete integration modal when cancel is clicked and integration has no data streams', async () => {
    mockUseGetIntegrationById.mockReturnValue({
      integration: {
        integrationId: 'int-empty',
        title: 'Empty',
        description: 'No streams',
        status: 'completed',
        dataStreams: [],
      },
      isLoading: false,
      isError: false,
    });

    renderComponent('/edit/int-empty');

    fireEvent.click(screen.getByTestId('cancelButton'));

    expect(mockReportCancelButtonClicked).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText('Delete this integration?')).toBeInTheDocument();
    });
  });

  it('keeps Done disabled when integration has no data streams', () => {
    mockUseGetIntegrationById.mockReturnValue({
      integration: {
        integrationId: 'int-empty',
        title: 'Empty',
        description: 'No streams',
        status: 'completed',
        dataStreams: [],
      },
      isLoading: false,
      isError: false,
    });

    renderComponent('/edit/int-empty');

    expect(screen.getByTestId('doneButton')).toBeDisabled();
  });

  it('confirms delete integration from modal and navigates to manage', async () => {
    mockUseGetIntegrationById.mockReturnValue({
      integration: {
        integrationId: 'int-empty',
        title: 'Empty',
        description: 'No streams',
        status: 'completed',
        dataStreams: [],
      },
      isLoading: false,
      isError: false,
    });

    renderComponent('/edit/int-empty');

    fireEvent.click(screen.getByTestId('cancelButton'));

    await waitFor(() => {
      expect(screen.getByText('Delete integration')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Delete integration'));

    await waitFor(() => {
      expect(mockDeleteIntegrationMutateAsync).toHaveBeenCalledWith({
        integrationId: 'int-empty',
      });
    });

    expect(mockNavigateToApp).toHaveBeenCalledWith('integrations', expect.any(Object));
  });

  it('fires CreateIntegrationPageLoaded on mount for create route', () => {
    renderComponent('/create');

    expect(mockReportEvent).toHaveBeenCalledWith(
      AutomaticImportTelemetryEventType.CreateIntegrationPageLoaded,
      expect.objectContaining({ sessionId: 'test-session-id' })
    );
  });

  it('fires EditIntegrationPageLoaded on mount for edit route', () => {
    mockUseGetIntegrationById.mockReturnValue({
      integration: undefined,
      isLoading: false,
      isError: false,
    });

    renderComponent('/edit/int-1');

    expect(mockReportEvent).toHaveBeenCalledWith(
      AutomaticImportTelemetryEventType.EditIntegrationPageLoaded,
      expect.objectContaining({ sessionId: 'test-session-id', integrationId: 'int-1' })
    );
  });
});

describe('IntegrationManagement privilege gating', () => {
  const existingIntegration = {
    integrationId: 'int-1',
    title: 'Integration 1',
    description: 'desc',
    dataStreams: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(mockAutomaticImportCapabilities, {
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: true,
    });
    mockUseGetIntegrationById.mockReturnValue({
      integration: undefined,
      isLoading: false,
      isError: false,
    });
  });

  it('renders the create form when the user has the create capability', () => {
    renderComponent('/create');

    expect(screen.getByTestId('managementContentsMock')).toBeInTheDocument();
    expect(screen.queryByTestId('automaticImportInsufficientPrivileges')).not.toBeInTheDocument();
  });

  it('does not report a page load when the create capability is missing', () => {
    mockAutomaticImportCapabilities.create = false;

    renderComponent('/create');

    expect(mockReportEvent).not.toHaveBeenCalledWith(
      AutomaticImportTelemetryEventType.CreateIntegrationPageLoaded,
      expect.anything()
    );
  });

  it('does not report a page load when the edit capability is missing', () => {
    mockAutomaticImportCapabilities.edit = false;
    mockUseGetIntegrationById.mockReturnValue({
      integration: existingIntegration,
      isLoading: false,
      isError: false,
    });

    renderComponent('/edit/int-1');

    expect(mockReportEvent).not.toHaveBeenCalledWith(
      AutomaticImportTelemetryEventType.EditIntegrationPageLoaded,
      expect.anything()
    );
  });

  it('shows an insufficient privileges prompt on create without the create capability', () => {
    mockAutomaticImportCapabilities.create = false;

    renderComponent('/create');

    expect(screen.getByTestId('automaticImportInsufficientPrivileges')).toBeInTheDocument();
    expect(screen.queryByTestId('managementContentsMock')).not.toBeInTheDocument();
  });

  it('shows an insufficient privileges prompt on edit without the edit capability', () => {
    mockAutomaticImportCapabilities.edit = false;
    mockUseGetIntegrationById.mockReturnValue({
      integration: existingIntegration,
      isLoading: false,
      isError: false,
    });

    renderComponent('/edit/int-1');

    expect(screen.getByTestId('automaticImportInsufficientPrivileges')).toBeInTheDocument();
    expect(screen.queryByTestId('managementContentsMock')).not.toBeInTheDocument();
  });

  it('navigates back to manage integrations from the insufficient privileges prompt', () => {
    mockAutomaticImportCapabilities.create = false;

    renderComponent('/create');
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));

    expect(mockNavigateToApp).toHaveBeenCalledWith('integrations', {
      path: '/browse?view=manage',
    });
  });
});
