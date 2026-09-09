/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { UseQueryResult } from '@kbn/react-query';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import type { AccountType } from '../../../../common/types';
import { SINGLE_ACCOUNT, ORGANIZATION_ACCOUNT } from '../../../../common';
import { CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS } from '../../../../common/services/cloud_connectors/test_subjects';

import type { CloudConnectorUsageItem } from '../hooks/use_cloud_connector_usage';
import { useCloudConnectorUsage } from '../hooks/use_cloud_connector_usage';
import { useUpdateCloudConnector, updateCloudConnector } from '../hooks/use_update_cloud_connector';
import { useDeleteCloudConnector } from '../hooks/use_delete_cloud_connector';
import { useVerifyIacKey } from '../hooks/use_verify_iac_key';
import { useCloudConnectorTemplate } from '../hooks/use_cloud_connector_template';
import { useIacProvisioner, useStartServices } from '../../../hooks';

import { CloudConnectorPoliciesFlyout } from '.';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('../hooks/use_cloud_connector_usage');
jest.mock('../hooks/use_update_cloud_connector', () => ({
  useUpdateCloudConnector: jest.fn(),
  updateCloudConnector: jest.fn(() => Promise.resolve({})),
}));
jest.mock('../hooks/use_delete_cloud_connector');
jest.mock('../hooks/use_verify_iac_key');
jest.mock('../hooks/use_cloud_connector_template');
jest.mock('../../../hooks', () => ({
  useIacProvisioner: jest.fn(),
  useStartServices: jest.fn(),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseCloudConnectorUsage = useCloudConnectorUsage as jest.MockedFunction<
  typeof useCloudConnectorUsage
>;
const mockUseUpdateCloudConnector = useUpdateCloudConnector as jest.MockedFunction<
  typeof useUpdateCloudConnector
>;
const mockUpdateCloudConnector = updateCloudConnector as jest.MockedFunction<
  typeof updateCloudConnector
>;
const mockUseDeleteCloudConnector = useDeleteCloudConnector as jest.MockedFunction<
  typeof useDeleteCloudConnector
>;
const mockUseVerifyIacKey = useVerifyIacKey as jest.MockedFunction<typeof useVerifyIacKey>;
const mockUseCloudConnectorTemplate = useCloudConnectorTemplate as jest.MockedFunction<
  typeof useCloudConnectorTemplate
>;
const mockUseIacProvisioner = useIacProvisioner as jest.MockedFunction<typeof useIacProvisioner>;
const mockUseStartServices = useStartServices as jest.MockedFunction<typeof useStartServices>;

const VALID_STACK_ARN =
  'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/guid-guid-guid';

describe('CloudConnectorPoliciesFlyout', () => {
  let queryClient: QueryClient;
  const mockOnClose = jest.fn();
  const mockNavigateToApp = jest.fn();
  const mockReportEvent = jest.fn();
  const mockHttp = {} as ReturnType<typeof useStartServices>['http'];
  const mockLaunchOnClick = jest.fn(() => Promise.resolve());

  const defaultProps = {
    cloudConnectorId: 'connector-123',
    cloudConnectorName: 'Test Connector',
    cloudConnectorVars: {
      role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole' },
      external_id: { value: { isSecretRef: true, id: 'secret-ref-id-123' } },
    },
    accountType: SINGLE_ACCOUNT as AccountType,
    provider: 'aws' as const,
    onClose: mockOnClose,
  };

  const mockUsageData: CloudConnectorUsageItem[] = [
    {
      id: 'policy-1',
      name: 'Test Policy 1',
      package: {
        name: 'cloud_security_posture',
        title: 'Cloud Security Posture',
        version: '1.0.0',
      },
      policy_ids: ['agent-policy-1'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mockUseKibana.mockReturnValue({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
        },
      },
    } as unknown as ReturnType<typeof useKibana>);

    mockUseStartServices.mockReturnValue({
      analytics: { reportEvent: mockReportEvent },
      http: mockHttp,
    } as unknown as ReturnType<typeof useStartServices>);

    mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });

    mockUseCloudConnectorUsage.mockReturnValue({
      data: { items: mockUsageData, total: mockUsageData.length, page: 1, perPage: 10 },
      isLoading: false,
      error: null,
    } as unknown as UseQueryResult<{ items: CloudConnectorUsageItem[]; total: number; page: number; perPage: number }>);

    const mockMutate = jest.fn();
    mockUseUpdateCloudConnector.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    } as unknown as ReturnType<typeof useUpdateCloudConnector>);

    const mockDeleteMutate = jest.fn();
    mockUseDeleteCloudConnector.mockReturnValue({
      mutate: mockDeleteMutate,
      isLoading: false,
    } as unknown as ReturnType<typeof useDeleteCloudConnector>);

    mockUseVerifyIacKey.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useVerifyIacKey>);

    mockUseCloudConnectorTemplate.mockReturnValue({
      launchButtonProps: { onClick: mockLaunchOnClick },
      isDisabled: false,
      isGeneratingTemplate: false,
      isIacProvisionerEnabled: true,
    });

    mockOnClose.mockClear();
    mockNavigateToApp.mockClear();
    mockReportEvent.mockClear();
    mockLaunchOnClick.mockClear();
    mockUpdateCloudConnector.mockClear();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderFlyout = (props = {}) => {
    return render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <CloudConnectorPoliciesFlyout {...defaultProps} {...props} />
        </QueryClientProvider>
      </I18nProvider>
    );
  };

  it('should render flyout with connector name and ARN', () => {
    renderFlyout();

    expect(
      screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.TITLE)
    ).toHaveTextContent('Test Connector');
    expect(
      screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IDENTIFIER_TEXT)
    ).toHaveTextContent('Role ARN: arn:aws:iam::123456789012:role/TestRole');
  });

  it('should render usage table with policies', async () => {
    renderFlyout();

    await waitFor(() => {
      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.POLICIES_TABLE)
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Test Policy 1')).toBeInTheDocument();
    expect(screen.getByText('Cloud Security Posture')).toBeInTheDocument();
  });

  it('should show empty state when no policies use the connector', () => {
    mockUseCloudConnectorUsage.mockReturnValue({
      data: { items: [], total: 0, page: 1, perPage: 10 },
      isLoading: false,
      error: null,
    } as unknown as UseQueryResult<{ items: CloudConnectorUsageItem[]; total: number; page: number; perPage: number }>);

    renderFlyout();

    expect(
      screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.EMPTY_STATE)
    ).toBeInTheDocument();
    expect(screen.getByText('No integrations using this federated identity')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockUseCloudConnectorUsage.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as UseQueryResult<{ items: CloudConnectorUsageItem[]; total: number; page: number; perPage: number }>);

    renderFlyout();

    expect(
      screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.POLICIES_TABLE)
    ).toHaveClass('euiBasicTable-loading');
  });

  it('should show error state', () => {
    mockUseCloudConnectorUsage.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as unknown as UseQueryResult<{ items: CloudConnectorUsageItem[]; total: number; page: number; perPage: number }>);

    renderFlyout();

    expect(
      screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.ERROR_STATE)
    ).toBeInTheDocument();
    expect(screen.getByText('Failed to load policies')).toBeInTheDocument();
  });

  it('should enable save button when name is changed', async () => {
    renderFlyout();

    const nameInput = screen.getByTestId(
      CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.NAME_INPUT
    ) as HTMLInputElement;
    const saveButton = screen.getByTestId(
      CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.FOOTER_SAVE_BUTTON
    );

    expect(saveButton).toBeDisabled();

    // Use fireEvent.change for controlled inputs - more reliable than userEvent
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });
  });

  it('should call mutate when save button is clicked', async () => {
    const user = userEvent.setup();
    const mockMutate = jest.fn();
    mockUseUpdateCloudConnector.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    } as unknown as ReturnType<typeof useUpdateCloudConnector>);

    renderFlyout();

    const nameInput = screen.getByTestId(
      CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.NAME_INPUT
    ) as HTMLInputElement;
    const saveButton = screen.getByTestId(
      CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.FOOTER_SAVE_BUTTON
    );

    // Use fireEvent.change for controlled inputs - more reliable than userEvent
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    await user.click(saveButton);

    expect(mockMutate).toHaveBeenCalledWith({ name: 'New Name' });
  });

  it('should navigate to policy when clicking policy name', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await waitFor(() => {
      expect(screen.getByText('Test Policy 1')).toBeInTheDocument();
    });

    const policyLink = screen.getByTestId(
      CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.POLICY_LINK
    );
    await user.click(policyLink);

    expect(mockNavigateToApp).toHaveBeenCalledWith('integrations', {
      path: '/edit-integration/policy-1',
    });
  });

  it('should close flyout when onClose is called', async () => {
    const user = userEvent.setup();
    renderFlyout();

    const closeButton = screen.getByTestId(
      CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.CLOSE_BUTTON
    );
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should display Azure subscription ID for Azure connector', () => {
    renderFlyout({
      provider: 'azure',
      cloudConnectorVars: {
        tenant_id: { value: 'tenant-123' },
        azure_credentials_cloud_connector_id: { value: 'subscription-123' },
      },
    });

    expect(
      screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IDENTIFIER_TEXT)
    ).toHaveTextContent('Federated Identity ID: subscription-123');
  });

  it('should display GCP service account email with Service Account Email label', () => {
    renderFlyout({
      provider: 'gcp',
      cloudConnectorVars: {
        'gcp.credentials.service_account_email': {
          value: 'cspm-sa@my-project.iam.gserviceaccount.com',
        },
        'gcp.credentials.audience': {
          value:
            '//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
        },
        gcp_credentials_cloud_connector_id: { value: { isSecretRef: true, id: 'secret-1' } },
      },
    });

    expect(
      screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IDENTIFIER_TEXT)
    ).toHaveTextContent('Service Account Email: cspm-sa@my-project.iam.gserviceaccount.com');
  });

  describe('pagination', () => {
    it('should call useCloudConnectorUsage with initial pagination parameters', () => {
      renderFlyout();

      expect(mockUseCloudConnectorUsage).toHaveBeenCalledWith('connector-123', 1, 10);
    });

    it('should display pagination controls when there are multiple pages', async () => {
      const manyPolicies: CloudConnectorUsageItem[] = Array.from({ length: 15 }, (_, i) => ({
        id: `policy-${i + 1}`,
        name: `Test Policy ${i + 1}`,
        package: {
          name: 'cloud_security_posture',
          title: 'Cloud Security Posture',
          version: '1.0.0',
        },
        policy_ids: [`agent-policy-${i + 1}`],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }));

      mockUseCloudConnectorUsage.mockReturnValue({
        data: { items: manyPolicies.slice(0, 10), total: 15, page: 1, perPage: 10 },
        isLoading: false,
        error: null,
      } as unknown as UseQueryResult<{
        items: CloudConnectorUsageItem[];
        total: number;
        page: number;
        perPage: number;
      }>);

      renderFlyout();

      await waitFor(() => {
        expect(
          screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.POLICIES_TABLE)
        ).toBeInTheDocument();
      });

      // EuiBasicTable renders pagination when totalItemCount > pageSize
      expect(screen.getByText('Rows per page: 10')).toBeInTheDocument();
    });

    it('should update pagination when page is changed', async () => {
      const user = userEvent.setup();

      mockUseCloudConnectorUsage.mockReturnValue({
        data: { items: mockUsageData, total: 25, page: 1, perPage: 10 },
        isLoading: false,
        error: null,
      } as unknown as UseQueryResult<{
        items: CloudConnectorUsageItem[];
        total: number;
        page: number;
        perPage: number;
      }>);

      renderFlyout();

      await waitFor(() => {
        expect(
          screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.POLICIES_TABLE)
        ).toBeInTheDocument();
      });

      // Click next page button
      const nextPageButton = screen.getByLabelText('Next page');
      await user.click(nextPageButton);

      // Verify the hook was called with page 2
      expect(mockUseCloudConnectorUsage).toHaveBeenLastCalledWith('connector-123', 2, 10);
    });

    it('should update pagination when page size is changed', async () => {
      const user = userEvent.setup();

      mockUseCloudConnectorUsage.mockReturnValue({
        data: { items: mockUsageData, total: 30, page: 1, perPage: 10 },
        isLoading: false,
        error: null,
      } as unknown as UseQueryResult<{
        items: CloudConnectorUsageItem[];
        total: number;
        page: number;
        perPage: number;
      }>);

      renderFlyout();

      await waitFor(() => {
        expect(
          screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.POLICIES_TABLE)
        ).toBeInTheDocument();
      });

      // Click on "Rows per page" button and select 25
      const rowsPerPageButton = screen.getByText('Rows per page: 10');
      await user.click(rowsPerPageButton);

      const option25 = await screen.findByText('25 rows');
      await user.click(option25);

      // Verify the hook was called with new page size
      expect(mockUseCloudConnectorUsage).toHaveBeenLastCalledWith('connector-123', 1, 25);
    });
  });

  describe('name validation', () => {
    it('should show validation error when name exceeds 255 characters', async () => {
      const user = userEvent.setup();
      renderFlyout();

      const nameInput = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.NAME_INPUT
      );

      await user.clear(nameInput);
      await user.click(nameInput);
      await user.paste('a'.repeat(256));

      expect(
        screen.getByText('Federated Identity Name must be 255 characters or less')
      ).toBeInTheDocument();
    });

    it('should keep save button disabled when name exceeds 255 characters', async () => {
      const user = userEvent.setup();
      renderFlyout();

      const nameInput = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.NAME_INPUT
      );
      const saveButton = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.FOOTER_SAVE_BUTTON
      );

      await user.clear(nameInput);
      await user.click(nameInput);
      await user.paste('a'.repeat(256));

      expect(saveButton).toBeDisabled();
    });

    it('should show validation error when name is empty', async () => {
      const user = userEvent.setup();
      renderFlyout();

      const nameInput = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.NAME_INPUT
      );

      await user.clear(nameInput);

      expect(screen.getByText('Federated Identity Name is required')).toBeInTheDocument();
    });

    it('should keep save button disabled when name is empty', async () => {
      const user = userEvent.setup();
      renderFlyout();

      const nameInput = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.NAME_INPUT
      );
      const saveButton = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.FOOTER_SAVE_BUTTON
      );

      await user.clear(nameInput);

      expect(saveButton).toBeDisabled();
    });

    it('should enable save button for valid name that is different from original', async () => {
      const user = userEvent.setup();
      renderFlyout();

      const nameInput = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.NAME_INPUT
      );
      const saveButton = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.FOOTER_SAVE_BUTTON
      );

      await user.clear(nameInput);
      await user.click(nameInput);
      await user.paste('Valid New Name');

      expect(saveButton).toBeEnabled();
      expect(screen.queryByText('Federated Identity Name is required')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Federated Identity Name must be 255 characters or less')
      ).not.toBeInTheDocument();
    });

    it('should accept name with exactly 255 characters', async () => {
      const user = userEvent.setup();
      renderFlyout();

      const nameInput = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.NAME_INPUT
      );
      const saveButton = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.FOOTER_SAVE_BUTTON
      );

      await user.clear(nameInput);
      await user.click(nameInput);
      await user.paste('a'.repeat(255));

      expect(saveButton).toBeEnabled();
      expect(
        screen.queryByText('Federated Identity Name must be 255 characters or less')
      ).not.toBeInTheDocument();
    });
  });

  describe('AccountBadge rendering', () => {
    it('should render Single Account badge in flyout header when accountType is single-account', () => {
      renderFlyout({ accountType: SINGLE_ACCOUNT });

      expect(screen.getByText('Single Account')).toBeInTheDocument();
    });

    it('should render Organization badge in flyout header when accountType is organization-account', () => {
      renderFlyout({ accountType: ORGANIZATION_ACCOUNT });

      expect(screen.getByText('Organization')).toBeInTheDocument();
    });

    it('should not render badge when accountType is undefined', () => {
      renderFlyout({ accountType: undefined });

      expect(screen.queryByText('Single Account')).not.toBeInTheDocument();
      expect(screen.queryByText('Organization')).not.toBeInTheDocument();
    });

    it('should render badge with default color variant in flyout', () => {
      const { container } = renderFlyout({ accountType: SINGLE_ACCOUNT });

      const badge = container.querySelector('.euiBadge');
      expect(badge?.className).toMatch(/euiBadge-default/);
    });
  });

  describe('delete cloud connector', () => {
    it('should render delete connector button', () => {
      renderFlyout();

      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.DELETE_CONNECTOR_BUTTON)
      ).toBeInTheDocument();
    });

    it('should disable delete button when there are integrations using the connector', () => {
      renderFlyout();

      const deleteButton = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.DELETE_CONNECTOR_BUTTON
      );
      expect(deleteButton).toBeDisabled();
    });

    it('should enable delete button when no integrations are using the connector', () => {
      mockUseCloudConnectorUsage.mockReturnValue({
        data: { items: [], total: 0, page: 1, perPage: 10 },
        isLoading: false,
        error: null,
      } as unknown as UseQueryResult<{
        items: CloudConnectorUsageItem[];
        total: number;
        page: number;
        perPage: number;
      }>);

      renderFlyout();

      const deleteButton = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.DELETE_CONNECTOR_BUTTON
      );
      expect(deleteButton).toBeEnabled();
    });

    it('should open confirmation modal when delete button is clicked', async () => {
      const user = userEvent.setup();
      mockUseDeleteCloudConnector.mockReturnValue({
        mutate: jest.fn(),
        isLoading: false,
      } as unknown as ReturnType<typeof useDeleteCloudConnector>);

      mockUseCloudConnectorUsage.mockReturnValue({
        data: { items: [], total: 0, page: 1, perPage: 10 },
        isLoading: false,
        error: null,
      } as unknown as UseQueryResult<{
        items: CloudConnectorUsageItem[];
        total: number;
        page: number;
        perPage: number;
      }>);

      renderFlyout();

      const deleteButton = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.DELETE_CONNECTOR_BUTTON
      );
      await user.click(deleteButton);

      // Confirmation modal should be visible
      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.DELETE_CONFIRM_MODAL)
      ).toBeInTheDocument();
    });

    it('should call delete mutate when confirm button is clicked in modal', async () => {
      const user = userEvent.setup();
      const mockDeleteMutate = jest.fn();
      mockUseDeleteCloudConnector.mockReturnValue({
        mutate: mockDeleteMutate,
        isLoading: false,
      } as unknown as ReturnType<typeof useDeleteCloudConnector>);

      mockUseCloudConnectorUsage.mockReturnValue({
        data: { items: [], total: 0, page: 1, perPage: 10 },
        isLoading: false,
        error: null,
      } as unknown as UseQueryResult<{
        items: CloudConnectorUsageItem[];
        total: number;
        page: number;
        perPage: number;
      }>);

      renderFlyout();

      // Click delete button to open modal
      const deleteButton = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.DELETE_CONNECTOR_BUTTON
      );
      await user.click(deleteButton);

      // Click confirm button in modal
      const confirmButton = screen.getByText('Delete identity');
      await user.click(confirmButton);

      expect(mockDeleteMutate).toHaveBeenCalledWith({});
    });

    it('should close modal when cancel button is clicked', async () => {
      const user = userEvent.setup();
      mockUseDeleteCloudConnector.mockReturnValue({
        mutate: jest.fn(),
        isLoading: false,
      } as unknown as ReturnType<typeof useDeleteCloudConnector>);

      mockUseCloudConnectorUsage.mockReturnValue({
        data: { items: [], total: 0, page: 1, perPage: 10 },
        isLoading: false,
        error: null,
      } as unknown as UseQueryResult<{
        items: CloudConnectorUsageItem[];
        total: number;
        page: number;
        perPage: number;
      }>);

      renderFlyout();

      // Click delete button to open modal
      const deleteButton = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.DELETE_CONNECTOR_BUTTON
      );
      await user.click(deleteButton);

      // Modal should be visible
      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.DELETE_CONFIRM_MODAL)
      ).toBeInTheDocument();

      // Click cancel button
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      // Modal should be closed
      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.DELETE_CONFIRM_MODAL)
      ).not.toBeInTheDocument();
    });

    it('should show loading state on delete button when deletion is in progress', () => {
      mockUseDeleteCloudConnector.mockReturnValue({
        mutate: jest.fn(),
        isLoading: true,
      } as unknown as ReturnType<typeof useDeleteCloudConnector>);

      mockUseCloudConnectorUsage.mockReturnValue({
        data: { items: [], total: 0, page: 1, perPage: 10 },
        isLoading: false,
        error: null,
      } as unknown as UseQueryResult<{
        items: CloudConnectorUsageItem[];
        total: number;
        page: number;
        perPage: number;
      }>);

      renderFlyout();

      // The delete button should show loading state
      const deleteButton = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.DELETE_CONNECTOR_BUTTON
      );

      // Check for loading spinner on the button
      const loadingSpinner = deleteButton.querySelector('.euiLoadingSpinner');
      expect(loadingSpinner).toBeInTheDocument();
    });
  });

  describe('IaC section', () => {
    it('(a) renders IaC section with key and deployment ID and a View stack link when ARN is valid', () => {
      renderFlyout({
        provider: 'aws',
        iacKey: 'sha256:abc',
        iacDeploymentId: VALID_STACK_ARN,
      });

      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_SECTION)
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_KEY_INPUT)
      ).toHaveValue('sha256:abc');
      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_DEPLOYMENT_ID_INPUT)
      ).toHaveValue(VALID_STACK_ARN);

      const viewStackLink = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_VIEW_STACK_LINK
      );
      expect(viewStackLink).toBeInTheDocument();
      expect(viewStackLink).toHaveAttribute(
        'href',
        expect.stringContaining('stacks/stackinfo?stackId=')
      );
    });

    it('(b) hides IaC section for Azure provider', () => {
      renderFlyout({
        provider: 'azure',
        cloudConnectorVars: {
          tenant_id: { value: 'tenant-123' },
          azure_credentials_cloud_connector_id: { value: 'subscription-123' },
        },
      });

      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_SECTION)
      ).not.toBeInTheDocument();
    });

    it('(c) hides IaC section when isIacProvisionerEnabled is false', () => {
      mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: false });

      renderFlyout({ provider: 'aws' });

      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_SECTION)
      ).not.toBeInTheDocument();
    });

    it('(d) shows upgrade callout with updated-template body and disabled button when upgrade_available and iacKey set but no deployment id', () => {
      const checkedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
      renderFlyout({
        provider: 'aws',
        iacKey: 'sha256:old',
        iacUpgradeStatus: 'upgrade_available',
        iacUpgradeCheckedAt: checkedAt,
      });

      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPGRADE_CALLOUT)
      ).toBeInTheDocument();
      expect(screen.getByText(/The IAM role template has been updated/)).toBeInTheDocument();
      expect(screen.getByText(/Checked/)).toBeInTheDocument();

      const updateButton = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPDATE_STACK_BUTTON
      );
      expect(updateButton).toBeDisabled();
    });

    it('(e) shows upgrade callout with static-template body when upgrade_available and no iacKey', () => {
      renderFlyout({
        provider: 'aws',
        iacUpgradeStatus: 'upgrade_available',
      });

      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPGRADE_CALLOUT)
      ).toBeInTheDocument();
      expect(screen.getByText(/static CloudFormation template/)).toBeInTheDocument();
    });

    it('(f) editing deployment ID to a valid ARN enables Save; Save calls updateConnector with iac_deployment_id only', async () => {
      const user = userEvent.setup();
      const mockMutate = jest.fn();
      mockUseUpdateCloudConnector.mockReturnValue({
        mutate: mockMutate,
        isLoading: false,
      } as unknown as ReturnType<typeof useUpdateCloudConnector>);

      renderFlyout({ provider: 'aws' });

      const deploymentIdInput = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_DEPLOYMENT_ID_INPUT
      );
      fireEvent.change(deploymentIdInput, { target: { value: VALID_STACK_ARN } });

      const saveButton = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.FOOTER_SAVE_BUTTON
      );
      await waitFor(() => expect(saveButton).toBeEnabled());
      await user.click(saveButton);

      expect(mockMutate).toHaveBeenCalledWith({ iac_deployment_id: VALID_STACK_ARN });
      expect(mockMutate).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: expect.anything() })
      );
      expect(mockMutate).not.toHaveBeenCalledWith(
        expect.objectContaining({ iac_key: expect.anything() })
      );
    });

    it('(g) an invalid deployment ID shows the field invalid and keeps Save disabled', async () => {
      renderFlyout({ provider: 'aws' });

      const deploymentIdInput = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_DEPLOYMENT_ID_INPUT
      );
      fireEvent.change(deploymentIdInput, { target: { value: 'not-an-arn' } });

      await waitFor(() => {
        expect(screen.getByText(/Enter a CloudFormation stack ARN/)).toBeInTheDocument();
      });

      const saveButton = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.FOOTER_SAVE_BUTTON
      );
      expect(saveButton).toBeDisabled();
    });

    it('(h) clearing a previously-set key does NOT send iac_key empty and keeps Save disabled if nothing else changed', () => {
      renderFlyout({ provider: 'aws', iacKey: 'sha256:old' });

      const keyInput = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_KEY_INPUT
      );
      // Clearing the field (setting to empty)
      fireEvent.change(keyInput, { target: { value: '' } });

      const saveButton = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.FOOTER_SAVE_BUTTON
      );
      expect(saveButton).toBeDisabled();
    });

    it('(i) Update click reports telemetry and calls launchButtonProps.onClick', async () => {
      const user = userEvent.setup();
      mockUseVerifyIacKey.mockReturnValue({
        data: {
          matches: false,
          integrations: [{ name: 'aws', policyTemplates: ['cspm'] }],
        },
      } as unknown as ReturnType<typeof useVerifyIacKey>);

      renderFlyout({
        provider: 'aws',
        iacKey: 'sha256:old',
        iacDeploymentId: VALID_STACK_ARN,
        iacUpgradeStatus: 'upgrade_available',
      });

      const updateButton = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPDATE_STACK_BUTTON
      );
      await user.click(updateButton);

      expect(mockReportEvent).toHaveBeenCalledWith(
        'iac_provisioner_key_check_action',
        expect.objectContaining({
          surface: 'flyout',
          action: 'update_stack_clicked',
          reason: 'key_mismatch',
          hasDeploymentId: true,
        })
      );
      expect(mockLaunchOnClick).toHaveBeenCalled();
    });

    it('(j) onTemplateRendered calls updateCloudConnector with iac_key, syncs editedIacKey, and no toast', async () => {
      let capturedOnTemplateRendered: ((rendered: { key?: string }) => void) | undefined;
      mockUseCloudConnectorTemplate.mockImplementation((params) => {
        capturedOnTemplateRendered = params.onTemplateRendered;
        return {
          launchButtonProps: { onClick: mockLaunchOnClick },
          isDisabled: false,
          isGeneratingTemplate: false,
          isIacProvisionerEnabled: true,
        };
      });

      // Start with the old key so editedIacKey initialises to 'sha256:old'.
      const { rerender } = renderFlyout({ provider: 'aws', iacKey: 'sha256:old' });

      expect(capturedOnTemplateRendered).toBeDefined();
      capturedOnTemplateRendered!({ key: 'sha256:new' });

      await waitFor(() => {
        expect(mockUpdateCloudConnector).toHaveBeenCalledWith(mockHttp, 'connector-123', {
          iac_key: 'sha256:new',
        });
      });

      // Simulate the parent refetching with the new iacKey prop.
      rerender(
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <CloudConnectorPoliciesFlyout {...defaultProps} provider="aws" iacKey="sha256:new" />
          </QueryClientProvider>
        </I18nProvider>
      );

      // setEditedIacKey('sha256:new') was called in .then(): input reflects the rendered key.
      // Without the fix, editedIacKey would still be 'sha256:old' here and this would fail.
      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_KEY_INPUT)
      ).toHaveValue('sha256:new');

      // editedIacKey matches iacKey prop — iacKeyToSave is undefined — Save is disabled.
      // Without the fix, iacKeyToSave would be 'sha256:old' and Save would be enabled.
      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.FOOTER_SAVE_BUTTON)
      ).toBeDisabled();

      // Raw request only — no toast: useUpdateCloudConnector's mutate must NOT have been called.
      const { mutate: toastingMutate } = mockUseUpdateCloudConnector.mock.results[0].value;
      expect(toastingMutate).not.toHaveBeenCalled();
    });

    it('(j-arn) onTemplateRendered includes iac_deployment_id in write body when a valid ARN is edited', async () => {
      let capturedOnTemplateRendered: ((rendered: { key?: string }) => void) | undefined;
      mockUseCloudConnectorTemplate.mockImplementation((params) => {
        capturedOnTemplateRendered = params.onTemplateRendered;
        return {
          launchButtonProps: { onClick: mockLaunchOnClick },
          isDisabled: false,
          isGeneratingTemplate: false,
          isIacProvisionerEnabled: true,
        };
      });

      renderFlyout({ provider: 'aws', iacKey: 'sha256:new' });

      // User edits the deployment ID to a valid stack ARN.
      const deploymentIdInput = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_DEPLOYMENT_ID_INPUT
      );
      fireEvent.change(deploymentIdInput, { target: { value: VALID_STACK_ARN } });

      capturedOnTemplateRendered!({ key: 'sha256:new' });

      await waitFor(() => {
        expect(mockUpdateCloudConnector).toHaveBeenCalledWith(mockHttp, 'connector-123', {
          iac_key: 'sha256:new',
          iac_deployment_id: VALID_STACK_ARN,
        });
      });
    });

    it('(k) useCloudConnectorTemplate receives provider aws, integrations from verification, and edited deploymentId', () => {
      const mockIntegrations = [{ name: 'aws', policyTemplates: ['cspm'] }];
      mockUseVerifyIacKey.mockReturnValue({
        data: {
          matches: false,
          integrations: mockIntegrations,
        },
      } as unknown as ReturnType<typeof useVerifyIacKey>);

      renderFlyout({
        provider: 'aws',
        iacDeploymentId: VALID_STACK_ARN,
        iacUpgradeStatus: 'upgrade_available',
      });

      expect(mockUseCloudConnectorTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'aws',
          integrations: mockIntegrations,
          deploymentId: VALID_STACK_ARN,
        })
      );
    });

    it('(l) useVerifyIacKey is enabled only when upgrade_available and IaC section is shown', () => {
      renderFlyout({
        provider: 'aws',
        iacUpgradeStatus: 'upgrade_available',
      });

      expect(mockUseVerifyIacKey).toHaveBeenCalledWith(
        expect.not.objectContaining({ integration: expect.anything() })
      );
      expect(mockUseVerifyIacKey).toHaveBeenCalledWith({
        cloudConnectorId: 'connector-123',
        enabled: true,
      });
    });

    it('(l-disabled) useVerifyIacKey is disabled when iacUpgradeStatus is up_to_date', () => {
      renderFlyout({
        provider: 'aws',
        iacUpgradeStatus: 'up_to_date',
      });

      expect(mockUseVerifyIacKey).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    });

    it('(l-disabled-azure) useVerifyIacKey is disabled for non-AWS provider', () => {
      renderFlyout({
        provider: 'azure',
        cloudConnectorVars: {
          tenant_id: { value: 'tenant-123' },
          azure_credentials_cloud_connector_id: { value: 'subscription-123' },
        },
        iacUpgradeStatus: 'upgrade_available',
      });

      expect(mockUseVerifyIacKey).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    });
  });
});
