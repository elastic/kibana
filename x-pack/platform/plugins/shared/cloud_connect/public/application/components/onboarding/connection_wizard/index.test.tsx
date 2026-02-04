/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ConnectionWizard } from '.';
import { useCloudConnectedAppContext } from '../../../app_context';
import type { CloudConnectedAppContextValue } from '../../../app_context';

jest.mock('../../../app_context');

const mockUseCloudConnectedAppContext = useCloudConnectedAppContext as jest.MockedFunction<
  typeof useCloudConnectedAppContext
>;

const renderWithIntl = (component: React.ReactElement) => {
  return render(
    <IntlProvider locale="en" messages={{}}>
      {component}
    </IntlProvider>
  );
};

describe('ConnectionWizard', () => {
  const mockOnConnect = jest.fn();
  const mockTelemetryClient = {
    trackClusterConnected: jest.fn(),
    trackClusterDisconnected: jest.fn(),
    trackServiceEnabled: jest.fn(),
    trackServiceDisabled: jest.fn(),
    trackLinkClicked: jest.fn(),
  };
  const mockApiService = {
    authenticate: jest.fn(),
    useLoadConfig: jest.fn(),
    useLoadClusterDetails: jest.fn(),
    updateServices: jest.fn(),
    disconnectCluster: jest.fn(),
  };
  const mockSetJustConnected = jest.fn();
  const mockContext: CloudConnectedAppContextValue = {
    chrome: {} as any,
    application: {} as any,
    http: {} as any,
    notifications: {} as any,
    history: {} as any,
    docLinks: {
      links: {
        kibana: {
          secureSavedObject: 'https://docs.elastic.co/encryption',
        },
      },
    } as any,
    cloudUrl: 'https://cloud.elastic.co',
    telemetryService: mockTelemetryClient as any,
    apiService: mockApiService as any,
    clusterConfig: {
      hasEncryptedSOEnabled: true,
      license: { type: 'platinum', uid: 'license-123' },
      cluster: { id: 'cluster-123', name: 'test-cluster', version: '8.15.0' },
    },
    hasConfigurePermission: true,
    licensing: {} as any,
    justConnected: false,
    setJustConnected: mockSetJustConnected,
    autoEnablingEis: false,
    setAutoEnablingEis: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCloudConnectedAppContext.mockReturnValue(mockContext);
  });

  it('should render 2 steps when hasEncryptedSOEnabled is true', () => {
    renderWithIntl(<ConnectionWizard onConnect={mockOnConnect} />);

    // Step 1: Sign up or log in buttons should be present
    expect(screen.getByTestId('connectionWizardSignUpButton')).toBeInTheDocument();
    expect(screen.getByTestId('connectionWizardLoginButton')).toBeInTheDocument();

    // Step 2 (encryption warning) should NOT be present
    expect(screen.queryByTestId('connectionWizardEncryptionWarning')).not.toBeInTheDocument();

    // Step 3: API key input should be present (step 2 in UI since step 2 is skipped)
    expect(screen.getByTestId('connectionWizardApiKeyInput')).toBeInTheDocument();
  });

  it('should render 3 steps when hasEncryptedSOEnabled is false', () => {
    mockUseCloudConnectedAppContext.mockReturnValue({
      ...mockContext,
      clusterConfig: {
        ...mockContext.clusterConfig!,
        hasEncryptedSOEnabled: false,
      },
    });

    renderWithIntl(<ConnectionWizard onConnect={mockOnConnect} />);

    // Step 1: Sign up or log in buttons should be present
    expect(screen.getByTestId('connectionWizardSignUpButton')).toBeInTheDocument();
    expect(screen.getByTestId('connectionWizardLoginButton')).toBeInTheDocument();

    // Step 2: Configure encryption key (should be present)
    expect(screen.getByTestId('connectionWizardEncryptionWarning')).toBeInTheDocument();

    // Step 3: API key input should be present
    expect(screen.getByTestId('connectionWizardApiKeyInput')).toBeInTheDocument();
  });

  it('should disable API key input when hasEncryptedSOEnabled is false', () => {
    mockUseCloudConnectedAppContext.mockReturnValue({
      ...mockContext,
      clusterConfig: {
        ...mockContext.clusterConfig!,
        hasEncryptedSOEnabled: false,
      },
    });

    renderWithIntl(<ConnectionWizard onConnect={mockOnConnect} />);

    const input = screen.getByTestId('connectionWizardApiKeyInput');
    expect(input).toBeDisabled();
  });

  it('should disable Connect button when API key is empty', () => {
    renderWithIntl(<ConnectionWizard onConnect={mockOnConnect} />);

    const connectButton = screen.getByTestId('connectionWizardConnectButton');
    expect(connectButton).toBeDisabled();
  });

  it('should disable Connect button when hasEncryptedSOEnabled is false', () => {
    mockUseCloudConnectedAppContext.mockReturnValue({
      ...mockContext,
      clusterConfig: {
        ...mockContext.clusterConfig!,
        hasEncryptedSOEnabled: false,
      },
    });

    renderWithIntl(<ConnectionWizard onConnect={mockOnConnect} />);

    const connectButton = screen.getByTestId('connectionWizardConnectButton');
    expect(connectButton).toBeDisabled();
  });

  it('should enable Connect button when API key is entered AND hasEncryptedSOEnabled is true', async () => {
    renderWithIntl(<ConnectionWizard onConnect={mockOnConnect} />);

    const input = screen.getByTestId('connectionWizardApiKeyInput');
    const connectButton = screen.getByTestId('connectionWizardConnectButton');

    // Initially disabled
    expect(connectButton).toBeDisabled();

    // Type an API key
    await userEvent.type(input, 'test-api-key-123');

    // Should now be enabled
    expect(connectButton).not.toBeDisabled();
  });

  it('should display error callout when authentication fails', async () => {
    mockApiService.authenticate = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Invalid API key' },
    });

    renderWithIntl(<ConnectionWizard onConnect={mockOnConnect} />);

    const input = screen.getByTestId('connectionWizardApiKeyInput');
    const connectButton = screen.getByTestId('connectionWizardConnectButton');

    await userEvent.type(input, 'invalid-key');
    await userEvent.click(connectButton);

    await waitFor(() => {
      expect(screen.getByTestId('connectionWizardError')).toBeInTheDocument();
    });

    expect(mockOnConnect).not.toHaveBeenCalled();
  });

  it('should show loading state during authentication', async () => {
    let resolveAuthenticate: any;
    const authenticatePromise = new Promise((resolve) => {
      resolveAuthenticate = resolve;
    });
    mockApiService.authenticate = jest.fn().mockReturnValue(authenticatePromise);

    renderWithIntl(<ConnectionWizard onConnect={mockOnConnect} />);

    const input = screen.getByTestId('connectionWizardApiKeyInput');
    const connectButton = screen.getByTestId('connectionWizardConnectButton');

    await userEvent.type(input, 'test-api-key');
    await userEvent.click(connectButton);

    // Button should be disabled during loading
    await waitFor(() => {
      expect(connectButton).toBeDisabled();
    });

    // Resolve the promise
    resolveAuthenticate({ data: { success: true }, error: null });

    await waitFor(() => {
      expect(mockOnConnect).toHaveBeenCalled();
    });
  });

  it('should call onConnect callback on successful authentication', async () => {
    mockApiService.authenticate = jest.fn().mockResolvedValue({
      data: { success: true, cluster_id: 'cluster-123', organization_id: 'org-123' },
      error: null,
    });

    renderWithIntl(<ConnectionWizard onConnect={mockOnConnect} />);

    const input = screen.getByTestId('connectionWizardApiKeyInput');
    const connectButton = screen.getByTestId('connectionWizardConnectButton');

    await userEvent.type(input, 'valid-api-key');
    await userEvent.click(connectButton);

    await waitFor(() => {
      expect(mockApiService.authenticate).toHaveBeenCalledWith('valid-api-key');
      expect(mockOnConnect).toHaveBeenCalled();
    });

    // No error should be displayed
    expect(screen.queryByTestId('connectionWizardError')).not.toBeInTheDocument();
  });

  it('should set justConnected to true on successful authentication', async () => {
    mockApiService.authenticate = jest.fn().mockResolvedValue({
      data: { success: true, cluster_id: 'cluster-123', organization_id: 'org-123' },
      error: null,
    });

    renderWithIntl(<ConnectionWizard onConnect={mockOnConnect} />);

    const input = screen.getByTestId('connectionWizardApiKeyInput');
    const connectButton = screen.getByTestId('connectionWizardConnectButton');

    await userEvent.type(input, 'valid-api-key');
    await userEvent.click(connectButton);

    await waitFor(() => {
      expect(mockSetJustConnected).toHaveBeenCalledWith(true);
    });
  });
});
