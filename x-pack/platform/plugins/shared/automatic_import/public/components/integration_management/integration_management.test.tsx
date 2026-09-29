/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import { IntegrationManagement } from './integration_management';
import { AutomaticImportTelemetryEventType } from '../../../common/telemetry/types';

const mockNavigateToApp = vi.fn();
const mockNavigateToUrl = vi.fn();
const mockGetUrlForApp = vi.fn(() => '/mock-integrations-url');
const mockReportCancelButtonClicked = vi.fn();
const mockReportDoneButtonClicked = vi.fn();
const mockReportEvent = vi.fn();
const mockUseGetIntegrationById = vi.fn();
const mockDeleteIntegrationMutateAsync = vi.fn().mockResolvedValue(undefined);
const mockCreateUpdateIntegrationMutateAsync = vi.fn().mockResolvedValue(undefined);
const mockSubmit = vi.fn();

const mockEnterpriseLicense = {
  isAvailable: true,
  isActive: true,
  hasAtLeast: (licenseType: string) => licenseType === 'enterprise',
};

const mockLicense$ = new BehaviorSubject(mockEnterpriseLicense);

vi.mock('react-use/lib/useObservable', () => ({
  __esModule: true,
  default: (obs$: { getValue?: () => unknown }) =>
    typeof obs$?.getValue === 'function' ? obs$.getValue() : undefined,
}));

vi.mock('../../common/hooks/use_kibana', () => {
  const mocked = {
    useKibana: () => ({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
          getUrlForApp: mockGetUrlForApp,
          navigateToUrl: mockNavigateToUrl,
        },
        licensing: {
          license$: mockLicense$,
        },
        telemetry: {
          reportEvent: mockReportEvent,
        },
      },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../common', () => {
  const mocked = {
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
    useKibana: () => ({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
          getUrlForApp: mockGetUrlForApp,
          navigateToUrl: mockNavigateToUrl,
        },
        licensing: {
          license$: mockLicense$,
        },
        telemetry: {
          reportEvent: mockReportEvent,
        },
      },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../telemetry_context', () => {
  const mocked = {
    useTelemetry: () => ({
      sessionId: 'test-session-id',
      reportCancelButtonClicked: mockReportCancelButtonClicked,
      reportDoneButtonClicked: mockReportDoneButtonClicked,
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./management_contents/management_contents', () => {
  const mocked = {
    ManagementContents: () => <div data-test-subj="managementContentsMock" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../common/components/connector_selector', () => {
  const mocked = {
    ConnectorSelector: () => <div data-test-subj="connectorSelectorMock" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./forms/integration_form', () => {
  const mocked = {
    IntegrationFormProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useIntegrationForm: () => ({
      formData: {},
      form: {},
      submit: mockSubmit,
      isFormModified: true,
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../common/components/button_footer', () => {
  const mocked = {
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
  };
  return { ...mocked, default: mocked };
});

const renderComponent = (path = '/create') =>
  render(
    <MockAppHeaderProvider>
      <I18nProvider>
        <MemoryRouter initialEntries={[path]}>
          <Route path={['/edit/:integrationId', '/create']}>
            <IntegrationManagement />
          </Route>
        </MemoryRouter>
      </I18nProvider>
    </MockAppHeaderProvider>
  );

describe('IntegrationManagement telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('navigates to the return app when return params are present on cancel', () => {
    renderComponent('/create?returnAppId=observabilityOnboarding&returnPath=%3F');

    fireEvent.click(screen.getByTestId('cancelButton'));

    expect(mockReportCancelButtonClicked).toHaveBeenCalledTimes(1);
    expect(mockNavigateToApp).toHaveBeenCalledWith('observabilityOnboarding', {
      path: '?',
    });
  });

  it('renders Back to selection on create when return params are present', () => {
    renderComponent('/create?returnAppId=observabilityOnboarding&returnPath=%3F');

    fireEvent.click(screen.getByRole('button', { name: 'Back to selection' }));

    expect(mockNavigateToApp).toHaveBeenCalledWith('observabilityOnboarding', {
      path: '?',
    });
    expect(mockReportCancelButtonClicked).not.toHaveBeenCalled();
  });

  it('does not render a back link on create without return params', () => {
    renderComponent('/create');

    expect(screen.queryByRole('button', { name: 'Back to selection' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument();
  });

  it('does not render a back link on create for an unknown returnAppId', () => {
    renderComponent('/create?returnAppId=otherApp&returnPath=%2Ffoo');

    expect(screen.queryByRole('button', { name: 'Back to selection' })).not.toBeInTheDocument();
  });

  it('does not render a back link on edit even when return params are present', () => {
    mockUseGetIntegrationById.mockReturnValue({
      integration: {
        integrationId: 'int-1',
        title: 'Existing',
        description: 'd',
        status: 'completed',
        dataStreams: [],
      },
      isLoading: false,
      isError: false,
    });
    renderComponent('/edit/int-1?returnAppId=observabilityOnboarding&returnPath=%3F');

    expect(screen.queryByRole('button', { name: 'Back to selection' })).not.toBeInTheDocument();
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
