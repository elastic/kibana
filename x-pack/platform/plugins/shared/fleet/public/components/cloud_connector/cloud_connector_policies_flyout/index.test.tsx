/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
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
import {
  useCloudConnectorTemplate,
  type TemplateRendered,
} from '../hooks/use_cloud_connector_template';
import { useGetPackageInfoByKeyQuery, useIacProvisioner, useStartServices } from '../../../hooks';
import { sendVerifyCloudConnectorIacKey } from '../../../hooks/use_request/cloud_connector';
import { getAnyCloudConnectorIacTemplateUrl } from '../utils';

import { CloudConnectorPoliciesFlyout } from '.';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('../hooks/use_cloud_connector_usage');
jest.mock('../hooks/use_update_cloud_connector', () => ({
  useUpdateCloudConnector: jest.fn(),
  updateCloudConnector: jest.fn(() => Promise.resolve({})),
}));
jest.mock('../hooks/use_delete_cloud_connector');
jest.mock('../hooks/use_verify_iac_key');
jest.mock('../../../hooks/use_request/cloud_connector', () => ({
  sendVerifyCloudConnectorIacKey: jest.fn(() => Promise.resolve({ data: {}, error: undefined })),
}));
jest.mock('../hooks/use_cloud_connector_template');
jest.mock('../../../hooks', () => ({
  useIacProvisioner: jest.fn(),
  useStartServices: jest.fn(),
  useGetPackageInfoByKeyQuery: jest.fn(),
}));
jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  getAnyCloudConnectorIacTemplateUrl: jest.fn(),
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
const mockSendVerify = sendVerifyCloudConnectorIacKey as jest.MockedFunction<
  typeof sendVerifyCloudConnectorIacKey
>;
const mockUseGetPackageInfoByKeyQuery = useGetPackageInfoByKeyQuery as jest.MockedFunction<
  typeof useGetPackageInfoByKeyQuery
>;
const mockGetAnyCloudConnectorIacTemplateUrl =
  getAnyCloudConnectorIacTemplateUrl as jest.MockedFunction<
    typeof getAnyCloudConnectorIacTemplateUrl
  >;

const QUICK_CREATE_TEMPLATE_URL =
  'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://elastic.example/static.yml';
const AWS_PACKAGE_ITEM = { name: 'aws', version: '9.0.0' };
const mockCloud = { isCloudEnabled: true, cloudId: 'cid' };

const VALID_STACK_ARN =
  'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/guid-guid-guid';
// Blueprint details the hook reports with every rendered key.
const RENDERED_BLUEPRINT = { blueprintId: 'federated-identity', blueprintVersion: '1.0.0' };
// What the on-open read answers by default: one attached integration, so every stack action has
// something to render. Tests about an empty or unreadable set override it.
const DEFAULT_INTEGRATIONS = [
  { name: 'aws', policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }] },
];

describe('CloudConnectorPoliciesFlyout', () => {
  let queryClient: QueryClient;
  const mockOnClose = jest.fn();
  const mockNavigateToApp = jest.fn();
  const mockReportEvent = jest.fn();
  const mockAddWarning = jest.fn();
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
      cloud: mockCloud,
      notifications: { toasts: { addWarning: mockAddWarning } },
    } as unknown as ReturnType<typeof useStartServices>);

    mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });

    mockUseGetPackageInfoByKeyQuery.mockReturnValue({
      data: { item: AWS_PACKAGE_ITEM },
    } as unknown as ReturnType<typeof useGetPackageInfoByKeyQuery>);
    mockGetAnyCloudConnectorIacTemplateUrl.mockReset();
    mockGetAnyCloudConnectorIacTemplateUrl.mockReturnValue(QUICK_CREATE_TEMPLATE_URL);

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
      data: { matches: true, outcome: 'not_checked', integrations: DEFAULT_INTEGRATIONS },
    } as unknown as ReturnType<typeof useVerifyIacKey>);

    mockUseCloudConnectorTemplate.mockReturnValue({
      launchButtonProps: { onClick: mockLaunchOnClick },
      isDisabled: false,
      isGeneratingTemplate: false,
      clearIacConfirm: jest.fn(),
      isIacProvisionerEnabled: true,
    });

    mockOnClose.mockClear();
    mockNavigateToApp.mockClear();
    mockReportEvent.mockClear();
    mockLaunchOnClick.mockClear();
    mockAddWarning.mockClear();
    // Reset, not clear: a test may swap in a write that stays pending until it releases it.
    mockUpdateCloudConnector.mockReset();
    mockUpdateCloudConnector.mockResolvedValue(
      {} as Awaited<ReturnType<typeof updateCloudConnector>>
    );
    mockSendVerify.mockClear();
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

    it('(c) shows the stack details but no stack action when the provisioner is off', () => {
      // The Deployment ID is a fact about the deployed stack whichever template created it; only
      // the actions need the provisioner.
      mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: false });

      renderFlyout({ provider: 'aws', iacUpgradeStatus: 'upgrade_available' });

      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_DEPLOYMENT_ID_INPUT)
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPGRADE_CALLOUT)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_REDEPLOY_BUTTON)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_LAUNCH_BUTTON)
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

      const callout = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPGRADE_CALLOUT
      );
      expect(callout).toBeInTheDocument();
      expect(screen.getByText(/The IAM role template has been updated/)).toBeInTheDocument();
      expect(screen.getByText(/Checked/)).toBeInTheDocument();

      const updateButton = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPDATE_STACK_BUTTON
      );
      expect(updateButton).toBeDisabled();
      // The set is renderable, so the missing ARN is the only thing holding Update back.
      expect(screen.getByText(/Fill in the Deployment ID below first/)).toBeInTheDocument();

      // Lives inside the stack details section, above the Deployment ID field.
      const section = screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_SECTION);
      expect(section).toContainElement(callout);
      const domOrder = Array.from(section.querySelectorAll('*'));
      expect(domOrder.indexOf(callout)).toBeLessThan(
        domOrder.indexOf(
          screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_DEPLOYMENT_ID_INPUT)
        )
      );
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

    it('(i) Update click reports telemetry and calls launchButtonProps.onClick', async () => {
      const user = userEvent.setup();
      mockUseVerifyIacKey.mockReturnValue({
        data: {
          matches: false,
          integrations: [
            {
              name: 'aws',
              policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
            },
          ],
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

    it('(i-recheck) Update click writes the key, runs one comparing re-check, invalidates the connector queries, and the callout clears with the stored status', async () => {
      const user = userEvent.setup();
      // On open the flyout only reads the integration set (compare: false).
      mockUseVerifyIacKey.mockReturnValue({
        data: {
          matches: true,
          outcome: 'not_checked',
          integrations: [
            {
              name: 'aws',
              policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
            },
          ],
        },
      } as unknown as ReturnType<typeof useVerifyIacKey>);
      // The launch renders and, right before opening the console, reports the key it rendered.
      mockUseCloudConnectorTemplate.mockImplementation(({ onTemplateRendered }) => ({
        launchButtonProps: {
          onClick: async () => {
            onTemplateRendered?.({ key: 'sha256:new', integrations: [], ...RENDERED_BLUEPRINT });
          },
        },
        isDisabled: false,
        isGeneratingTemplate: false,
        clearIacConfirm: jest.fn(),
        isIacProvisionerEnabled: true,
      }));
      type WrittenConnector = Awaited<ReturnType<typeof updateCloudConnector>>;
      let resolveWrite: () => void = () => {};
      mockUpdateCloudConnector.mockImplementation(
        () =>
          new Promise<WrittenConnector>((resolve) => {
            resolveWrite = () => resolve({} as WrittenConnector);
          })
      );
      const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

      const { rerender } = renderFlyout({
        provider: 'aws',
        iacKey: 'sha256:old',
        iacDeploymentId: VALID_STACK_ARN,
        iacUpgradeStatus: 'upgrade_available',
      });
      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPGRADE_CALLOUT)
      ).toBeInTheDocument();
      expect(mockSendVerify).not.toHaveBeenCalled();

      await user.click(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPDATE_STACK_BUTTON)
      );

      expect(mockReportEvent).toHaveBeenCalledWith(
        'iac_provisioner_key_check_action',
        expect.objectContaining({ surface: 'flyout', action: 'update_stack_clicked' })
      );
      await waitFor(() => {
        expect(mockUpdateCloudConnector).toHaveBeenCalledWith(mockHttp, 'connector-123', {
          iac_key: 'sha256:new',
          iac_blueprint_id: 'federated-identity',
          iac_blueprint_version: '1.0.0',
        });
      });
      // The re-check waits for the write: checking before it lands would compare the old key.
      expect(mockSendVerify).not.toHaveBeenCalled();
      expect(invalidateQueries).not.toHaveBeenCalled();
      await act(async () => {
        resolveWrite();
      });
      // One comparing check (compare defaults to true), directly, not through the on-open read.
      await waitFor(() => expect(mockSendVerify).toHaveBeenCalledTimes(1));
      expect(mockSendVerify).toHaveBeenCalledWith('connector-123', {});
      // The server stores the outcome of the re-check, so the lists carrying iac_upgrade_status
      // are re-read; the refreshed prop is what clears the callout.
      await waitFor(() => {
        expect(invalidateQueries).toHaveBeenCalledWith(['get-cloud-connectors']);
      });
      expect(invalidateQueries).toHaveBeenCalledWith(['cloud-connector-usage', 'connector-123']);

      // The parent re-reads the connector and passes the stored status down.
      rerender(
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <CloudConnectorPoliciesFlyout
              {...defaultProps}
              provider="aws"
              iacKey="sha256:new"
              iacDeploymentId={VALID_STACK_ARN}
              iacUpgradeStatus="up_to_date"
            />
          </QueryClientProvider>
        </I18nProvider>
      );
      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPGRADE_CALLOUT)
      ).not.toBeInTheDocument();
    });

    it('(i-write-failed) warns when the digest write fails, and neither re-checks nor invalidates', async () => {
      // Without the new key the callout would stay until the daily task runs again; the user has
      // to hear why instead of the failure being swallowed.
      mockUseVerifyIacKey.mockReturnValue({
        data: {
          matches: true,
          outcome: 'not_checked',
          integrations: [
            {
              name: 'aws',
              policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
            },
          ],
        },
      } as unknown as ReturnType<typeof useVerifyIacKey>);
      mockUseCloudConnectorTemplate.mockImplementation(({ onTemplateRendered }) => ({
        launchButtonProps: {
          onClick: async () => {
            onTemplateRendered?.({ key: 'sha256:new', integrations: [], ...RENDERED_BLUEPRINT });
          },
        },
        isDisabled: false,
        isGeneratingTemplate: false,
        clearIacConfirm: jest.fn(),
        isIacProvisionerEnabled: true,
      }));
      mockUpdateCloudConnector.mockRejectedValue(new Error('403 Forbidden'));
      const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
      const user = userEvent.setup();

      renderFlyout({
        provider: 'aws',
        iacKey: 'sha256:old',
        iacDeploymentId: VALID_STACK_ARN,
        iacUpgradeStatus: 'upgrade_available',
      });
      await user.click(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPDATE_STACK_BUTTON)
      );

      await waitFor(() => expect(mockAddWarning).toHaveBeenCalledTimes(1));
      expect(mockAddWarning).toHaveBeenCalledWith({
        title: 'Template details were not saved on the identity',
        text: 'Kibana could not record the new template for this identity, so the upgrade callout will stay until the daily check runs again. Try Update again.',
      });
      expect(mockSendVerify).not.toHaveBeenCalled();
      expect(invalidateQueries).not.toHaveBeenCalled();
      // The callout stays: nothing was stored.
      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPGRADE_CALLOUT)
      ).toBeInTheDocument();
    });

    it('(i-read-forbidden) tolerates a 403 on the on-open read: the stack details still render, with no action offered', () => {
      // The verify route is gated like the connector update; a read-only user cannot read the
      // integration set, so there is nothing to render a stack action from.
      mockUseVerifyIacKey.mockReturnValue({
        data: undefined,
        isError: true,
        error: Object.assign(new Error('Forbidden'), { statusCode: 403 }),
      } as unknown as ReturnType<typeof useVerifyIacKey>);

      renderFlyout({
        provider: 'aws',
        iacKey: 'sha256:old',
        iacDeploymentId: VALID_STACK_ARN,
        iacUpgradeStatus: 'upgrade_available',
      });

      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_SECTION)
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPGRADE_CALLOUT)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_REDEPLOY_BUTTON)
      ).not.toBeInTheDocument();
    });

    it('(i-no-integrations) hides the callout and every stack action when upgrade_available is stored but nothing is attached', () => {
      // The daily task skips connectors without integrations instead of clearing their status, so
      // a stale upgrade_available can outlive the last policy; there is nothing to update then.
      mockUseVerifyIacKey.mockReturnValue({
        data: { matches: true, outcome: 'not_checked', integrations: [] },
      } as unknown as ReturnType<typeof useVerifyIacKey>);

      renderFlyout({
        provider: 'aws',
        iacKey: 'sha256:old',
        iacUpgradeStatus: 'upgrade_available',
      });

      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPGRADE_CALLOUT)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPDATE_STACK_BUTTON)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_REDEPLOY_BUTTON)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_LAUNCH_BUTTON)
      ).not.toBeInTheDocument();
    });

    it('(i-status-only) the callout follows the stored status, not the outcome the on-open read reports', () => {
      // Nothing in the flyout compares templates: only the daily task discovers upgrades.
      const { unmount } = renderFlyout({ provider: 'aws', iacUpgradeStatus: 'upgrade_available' });
      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPGRADE_CALLOUT)
      ).toBeInTheDocument();
      unmount();

      renderFlyout({ provider: 'aws', iacUpgradeStatus: 'up_to_date' });
      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPGRADE_CALLOUT)
      ).not.toBeInTheDocument();
    });

    it('(i-open-is-a-read) opening the flyout writes nothing, compares nothing and invalidates nothing', async () => {
      const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

      renderFlyout({ provider: 'aws', iacUpgradeStatus: 'upgrade_available' });
      await waitFor(() => {
        expect(
          screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPGRADE_CALLOUT)
        ).toBeInTheDocument();
      });

      expect(mockUseVerifyIacKey).toHaveBeenCalledWith(expect.objectContaining({ compare: false }));
      expect(mockSendVerify).not.toHaveBeenCalled();
      expect(mockUpdateCloudConnector).not.toHaveBeenCalled();
      expect(mockLaunchOnClick).not.toHaveBeenCalled();
      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it('(j) onTemplateRendered calls updateCloudConnector with iac_key, leaves Save disabled, and no toast', async () => {
      let capturedOnTemplateRendered: ((rendered: TemplateRendered) => void) | undefined;
      mockUseCloudConnectorTemplate.mockImplementation((params) => {
        capturedOnTemplateRendered = params.onTemplateRendered;
        return {
          launchButtonProps: { onClick: mockLaunchOnClick },
          isDisabled: false,
          isGeneratingTemplate: false,
          clearIacConfirm: jest.fn(),
          isIacProvisionerEnabled: true,
        };
      });

      renderFlyout({ provider: 'aws', iacKey: 'sha256:old' });

      expect(capturedOnTemplateRendered).toBeDefined();
      capturedOnTemplateRendered!({ key: 'sha256:new', integrations: [], ...RENDERED_BLUEPRINT });

      await waitFor(() => {
        expect(mockUpdateCloudConnector).toHaveBeenCalledWith(mockHttp, 'connector-123', {
          iac_key: 'sha256:new',
          iac_blueprint_id: 'federated-identity',
          iac_blueprint_version: '1.0.0',
        });
      });

      // The key is written by the raw request only; the flyout's Save has nothing of its own to
      // send (the key is not an editable field), so it stays disabled.
      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.FOOTER_SAVE_BUTTON)
      ).toBeDisabled();

      // Raw request only — no toast: useUpdateCloudConnector's mutate must NOT have been called.
      const { mutate: toastingMutate } = mockUseUpdateCloudConnector.mock.results[0].value;
      expect(toastingMutate).not.toHaveBeenCalled();
    });

    it('(j-arn) onTemplateRendered includes iac_deployment_id in write body when a valid ARN is edited', async () => {
      let capturedOnTemplateRendered: ((rendered: TemplateRendered) => void) | undefined;
      mockUseCloudConnectorTemplate.mockImplementation((params) => {
        capturedOnTemplateRendered = params.onTemplateRendered;
        return {
          launchButtonProps: { onClick: mockLaunchOnClick },
          isDisabled: false,
          isGeneratingTemplate: false,
          clearIacConfirm: jest.fn(),
          isIacProvisionerEnabled: true,
        };
      });

      renderFlyout({ provider: 'aws', iacKey: 'sha256:new' });

      // User edits the deployment ID to a valid stack ARN.
      const deploymentIdInput = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_DEPLOYMENT_ID_INPUT
      );
      fireEvent.change(deploymentIdInput, { target: { value: VALID_STACK_ARN } });

      capturedOnTemplateRendered!({ key: 'sha256:new', integrations: [], ...RENDERED_BLUEPRINT });

      await waitFor(() => {
        expect(mockUpdateCloudConnector).toHaveBeenCalledWith(mockHttp, 'connector-123', {
          iac_key: 'sha256:new',
          iac_blueprint_id: 'federated-identity',
          iac_blueprint_version: '1.0.0',
          iac_deployment_id: VALID_STACK_ARN,
        });
      });
    });

    it('(k) useCloudConnectorTemplate receives provider aws, integrations from verification, and edited deploymentId', () => {
      const mockIntegrations = [
        { name: 'aws', policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }] },
      ];
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

    it('(k2) useCloudConnectorTemplate opts out of the static template fallback', () => {
      // This identity already has a generated template; the static one would downgrade it.
      renderFlyout({ provider: 'aws', iacUpgradeStatus: 'upgrade_available' });

      expect(mockUseCloudConnectorTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ staticTemplateFallback: false })
      );
    });

    it('(k3) renders the template generation error below the upgrade callout', () => {
      mockUseCloudConnectorTemplate.mockReturnValue({
        launchButtonProps: { onClick: mockLaunchOnClick },
        isDisabled: false,
        isGeneratingTemplate: false,
        clearIacConfirm: jest.fn(),
        templateGenerationError: 'boom',
        isIacProvisionerEnabled: true,
      });

      renderFlyout({ provider: 'aws', iacUpgradeStatus: 'upgrade_available' });

      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_TEMPLATE_ERROR_CALLOUT)
      ).toBeInTheDocument();
      expect(screen.getByText('boom')).toBeInTheDocument();
    });

    it('(k4) does not render the template generation error when no stack action is offered', () => {
      // No integrations: no callout, no Redeploy, no Launch, so no render to have failed.
      mockUseVerifyIacKey.mockReturnValue({
        data: { matches: true, outcome: 'no_integrations', integrations: [] },
      } as unknown as ReturnType<typeof useVerifyIacKey>);
      mockUseCloudConnectorTemplate.mockReturnValue({
        launchButtonProps: { onClick: mockLaunchOnClick },
        isDisabled: false,
        isGeneratingTemplate: false,
        clearIacConfirm: jest.fn(),
        templateGenerationError: 'boom',
        isIacProvisionerEnabled: true,
      });

      renderFlyout({ provider: 'aws', iacUpgradeStatus: 'up_to_date' });

      expect(
        screen.queryByTestId(
          CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_TEMPLATE_ERROR_CALLOUT
        )
      ).not.toBeInTheDocument();
    });

    it('(l) useVerifyIacKey reads the integration set only (compare: false) when the IaC section is shown', () => {
      renderFlyout({
        provider: 'aws',
        iacUpgradeStatus: 'upgrade_available',
      });

      expect(mockUseVerifyIacKey).toHaveBeenCalledWith(
        expect.not.objectContaining({ integrations: expect.anything() })
      );
      expect(mockUseVerifyIacKey).toHaveBeenCalledWith({
        cloudConnectorId: 'connector-123',
        compare: false,
        enabled: true,
      });
    });

    it('(l-up-to-date) useVerifyIacKey stays enabled when iacUpgradeStatus is up_to_date', () => {
      // Redeploy needs the connector's integration set, which only the verdict carries.
      renderFlyout({
        provider: 'aws',
        iacUpgradeStatus: 'up_to_date',
      });

      expect(mockUseVerifyIacKey).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
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

    it('(l-disabled-flag) useVerifyIacKey is disabled when the provisioner is off', () => {
      mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: false });

      renderFlyout({ provider: 'aws', iacUpgradeStatus: 'upgrade_available' });

      expect(mockUseVerifyIacKey).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    });
  });

  describe('Redeploy CloudFormation stack', () => {
    const integrations = [
      { name: 'aws', policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }] },
    ];
    const currentVerdict = () =>
      mockUseVerifyIacKey.mockReturnValue({
        data: { matches: true, outcome: 'matches', integrations },
      } as unknown as ReturnType<typeof useVerifyIacKey>);

    it('is offered for an up-to-date identity with integrations and a valid stack ARN', () => {
      currentVerdict();

      renderFlyout({
        provider: 'aws',
        iacKey: 'sha256:current',
        iacDeploymentId: VALID_STACK_ARN,
        iacUpgradeStatus: 'up_to_date',
      });

      const redeploy = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_REDEPLOY_BUTTON
      );
      expect(redeploy).toBeEnabled();
      expect(screen.getByText(/if the stack was not deployed or updated/)).toBeInTheDocument();
      // Sits inside the stack details section, above the Deployment ID field.
      const input = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_DEPLOYMENT_ID_INPUT
      );
      const section = screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_SECTION);
      expect(section).toContainElement(redeploy);
      const domOrder = Array.from(section.querySelectorAll('*'));
      expect(domOrder.indexOf(redeploy)).toBeLessThan(domOrder.indexOf(input));
      // No callout: the stack is current.
      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPGRADE_CALLOUT)
      ).not.toBeInTheDocument();
    });

    it('is offered to a keyless identity too', () => {
      currentVerdict();

      renderFlyout({ provider: 'aws', iacDeploymentId: VALID_STACK_ARN });

      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_REDEPLOY_BUTTON)
      ).toBeInTheDocument();
    });

    it('gives way to the upgrade callout while an update is pending, and returns once the stored status is current', () => {
      // The callout's Update is the action then; two launch buttons would compete.
      currentVerdict();
      const props = {
        provider: 'aws' as const,
        iacKey: 'sha256:old',
        iacDeploymentId: VALID_STACK_ARN,
      };

      const { rerender } = renderFlyout({ ...props, iacUpgradeStatus: 'upgrade_available' });

      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPGRADE_CALLOUT)
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_REDEPLOY_BUTTON)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/if the stack was not deployed or updated/)
      ).not.toBeInTheDocument();

      // The stored status refreshes to up_to_date (as after Update's re-check).
      rerender(
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <CloudConnectorPoliciesFlyout
              {...defaultProps}
              {...props}
              iacUpgradeStatus="up_to_date"
            />
          </QueryClientProvider>
        </I18nProvider>
      );

      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPGRADE_CALLOUT)
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_REDEPLOY_BUTTON)
      ).toBeInTheDocument();
    });

    it('is offered when the check failed open with matches but the stored status is up to date', () => {
      mockUseVerifyIacKey.mockReturnValue({
        data: { matches: true, outcome: 'key_unavailable', integrations },
      } as unknown as ReturnType<typeof useVerifyIacKey>);

      renderFlyout({
        provider: 'aws',
        iacKey: 'sha256:current',
        iacDeploymentId: VALID_STACK_ARN,
        iacUpgradeStatus: 'up_to_date',
      });

      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPGRADE_CALLOUT)
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_REDEPLOY_BUTTON)
      ).toBeInTheDocument();
    });

    it('is hidden without a stack ARN', () => {
      currentVerdict();

      renderFlyout({ provider: 'aws', iacKey: 'sha256:current' });

      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_REDEPLOY_BUTTON)
      ).not.toBeInTheDocument();
    });

    it('is hidden while the typed stack ARN is invalid, and appears once it is valid', async () => {
      currentVerdict();

      renderFlyout({ provider: 'aws', iacKey: 'sha256:current' });
      const deploymentIdInput = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_DEPLOYMENT_ID_INPUT
      );

      fireEvent.change(deploymentIdInput, { target: { value: 'not-an-arn' } });
      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_REDEPLOY_BUTTON)
      ).not.toBeInTheDocument();

      fireEvent.change(deploymentIdInput, { target: { value: VALID_STACK_ARN } });
      await waitFor(() => {
        expect(
          screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_REDEPLOY_BUTTON)
        ).toBeInTheDocument();
      });
    });

    it('is hidden when the verdict carries no integrations', () => {
      mockUseVerifyIacKey.mockReturnValue({
        data: { matches: true, outcome: 'no_integrations', integrations: [] },
      } as unknown as ReturnType<typeof useVerifyIacKey>);

      renderFlyout({ provider: 'aws', iacKey: 'sha256:current', iacDeploymentId: VALID_STACK_ARN });

      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_REDEPLOY_BUTTON)
      ).not.toBeInTheDocument();
    });

    it('click launches the same forced render as Update and reports redeploy_clicked', async () => {
      const user = userEvent.setup();
      currentVerdict();

      renderFlyout({
        provider: 'aws',
        iacKey: 'sha256:current',
        iacDeploymentId: VALID_STACK_ARN,
        iacUpgradeStatus: 'up_to_date',
      });

      await user.click(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_REDEPLOY_BUTTON)
      );

      expect(mockLaunchOnClick).toHaveBeenCalledTimes(1);
      expect(mockReportEvent).toHaveBeenCalledWith(
        'iac_provisioner_key_check_action',
        expect.objectContaining({
          surface: 'flyout',
          action: 'redeploy_clicked',
          reason: 'key_mismatch',
          hasDeploymentId: true,
        })
      );
      // No stored templateSha is sent, so the render is never short-circuited as "already current".
      expect(mockUseCloudConnectorTemplate).toHaveBeenCalledWith(
        expect.not.objectContaining({ templateSha: expect.anything() })
      );
    });

    it('click writes the rendered key, runs one comparing re-check and invalidates the connector queries', async () => {
      // Same path as Update, so a static identity moving to a generated template gets its stored
      // status brought in line right away.
      const user = userEvent.setup();
      currentVerdict();
      mockUseCloudConnectorTemplate.mockImplementation(({ onTemplateRendered }) => ({
        launchButtonProps: {
          onClick: async () => {
            onTemplateRendered?.({ key: 'sha256:new', integrations: [], ...RENDERED_BLUEPRINT });
          },
        },
        isDisabled: false,
        isGeneratingTemplate: false,
        clearIacConfirm: jest.fn(),
        isIacProvisionerEnabled: true,
      }));
      const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

      renderFlyout({
        provider: 'aws',
        iacDeploymentId: VALID_STACK_ARN,
        iacUpgradeStatus: 'up_to_date',
      });
      expect(mockSendVerify).not.toHaveBeenCalled();

      await user.click(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_REDEPLOY_BUTTON)
      );

      await waitFor(() => {
        expect(mockUpdateCloudConnector).toHaveBeenCalledWith(mockHttp, 'connector-123', {
          iac_key: 'sha256:new',
          iac_blueprint_id: 'federated-identity',
          iac_blueprint_version: '1.0.0',
        });
      });
      await waitFor(() => expect(mockSendVerify).toHaveBeenCalledWith('connector-123', {}));
      expect(mockSendVerify).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(invalidateQueries).toHaveBeenCalledWith(['get-cloud-connectors']);
      });
      expect(invalidateQueries).toHaveBeenCalledWith(['cloud-connector-usage', 'connector-123']);
    });

    it('reports reason no_key for a keyless identity', async () => {
      const user = userEvent.setup();
      currentVerdict();

      renderFlyout({ provider: 'aws', iacDeploymentId: VALID_STACK_ARN });

      await user.click(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_REDEPLOY_BUTTON)
      );

      expect(mockReportEvent).toHaveBeenCalledWith(
        'iac_provisioner_key_check_action',
        expect.objectContaining({ action: 'redeploy_clicked', reason: 'no_key' })
      );
    });

    it('shows the render error under the button when there is no upgrade callout', () => {
      currentVerdict();
      mockUseCloudConnectorTemplate.mockReturnValue({
        launchButtonProps: { onClick: mockLaunchOnClick },
        isDisabled: false,
        isGeneratingTemplate: false,
        clearIacConfirm: jest.fn(),
        templateGenerationError: 'boom',
        isIacProvisionerEnabled: true,
      });

      renderFlyout({
        provider: 'aws',
        iacKey: 'sha256:current',
        iacDeploymentId: VALID_STACK_ARN,
        iacUpgradeStatus: 'up_to_date',
      });

      expect(
        screen.getAllByTestId(
          CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_TEMPLATE_ERROR_CALLOUT
        )
      ).toHaveLength(1);
      expect(screen.getByText('boom')).toBeInTheDocument();
    });

    it('is not offered alongside Launch', () => {
      currentVerdict();

      renderFlyout({ provider: 'aws', iacKey: 'sha256:current', iacUpgradeStatus: 'up_to_date' });

      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_REDEPLOY_BUTTON)
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_LAUNCH_BUTTON)
      ).toBeInTheDocument();
    });

    it('shows the render error once, under the callout, while an update is pending', () => {
      mockUseVerifyIacKey.mockReturnValue({
        data: { matches: false, reason: 'key_mismatch', outcome: 'key_mismatch', integrations },
      } as unknown as ReturnType<typeof useVerifyIacKey>);
      mockUseCloudConnectorTemplate.mockReturnValue({
        launchButtonProps: { onClick: mockLaunchOnClick },
        isDisabled: false,
        isGeneratingTemplate: false,
        clearIacConfirm: jest.fn(),
        templateGenerationError: 'boom',
        isIacProvisionerEnabled: true,
      });

      renderFlyout({
        provider: 'aws',
        iacKey: 'sha256:old',
        iacDeploymentId: VALID_STACK_ARN,
        iacUpgradeStatus: 'upgrade_available',
      });

      expect(
        screen.getAllByTestId(
          CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_TEMPLATE_ERROR_CALLOUT
        )
      ).toHaveLength(1);
      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_REDEPLOY_BUTTON)
      ).not.toBeInTheDocument();
    });
  });

  describe('Launch CloudFormation (no stack ARN on record)', () => {
    // A legacy identity (no iac_deployment_id, often no iac_key) or one whose ARN was never saved
    // has no stack to update; Launch creates one from the current template.
    const integrations = [
      { name: 'aws', policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }] },
    ];
    const setRead = () =>
      mockUseVerifyIacKey.mockReturnValue({
        data: { matches: true, outcome: 'not_checked', integrations },
      } as unknown as ReturnType<typeof useVerifyIacKey>);
    const LAUNCH = CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_LAUNCH_BUTTON;
    const REDEPLOY = CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_REDEPLOY_BUTTON;

    it('is offered, with its help text, for a legacy identity with neither key nor stack ARN', () => {
      setRead();

      renderFlyout({ provider: 'aws' });

      expect(screen.getByTestId(LAUNCH)).toBeEnabled();
      expect(screen.getByTestId(LAUNCH)).toHaveTextContent('Launch CloudFormation');
      expect(screen.getByText(/no CloudFormation stack on record/)).toBeInTheDocument();
      expect(screen.queryByTestId(REDEPLOY)).not.toBeInTheDocument();
      // Inside the stack details section, above the Deployment ID field the user fills afterwards.
      const section = screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_SECTION);
      const domOrder = Array.from(section.querySelectorAll('*'));
      expect(domOrder.indexOf(screen.getByTestId(LAUNCH))).toBeLessThan(
        domOrder.indexOf(
          screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_DEPLOYMENT_ID_INPUT)
        )
      );
    });

    it('is offered while the typed stack ARN is invalid, and gives way to Redeploy once it is valid', async () => {
      setRead();

      renderFlyout({ provider: 'aws', iacKey: 'sha256:current' });
      const input = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_DEPLOYMENT_ID_INPUT
      );

      fireEvent.change(input, { target: { value: 'not-an-arn' } });
      expect(screen.getByTestId(LAUNCH)).toBeInTheDocument();
      expect(screen.queryByTestId(REDEPLOY)).not.toBeInTheDocument();

      fireEvent.change(input, { target: { value: VALID_STACK_ARN } });
      await waitFor(() => expect(screen.getByTestId(REDEPLOY)).toBeInTheDocument());
      expect(screen.queryByTestId(LAUNCH)).not.toBeInTheDocument();
    });

    it('is offered under the upgrade callout when there is no stack ARN: Update alone would be a dead end', () => {
      // The daily task flags every keyless legacy identity as upgrade available, and the
      // callout's Update stays disabled until an ARN is entered.
      setRead();

      renderFlyout({ provider: 'aws', iacUpgradeStatus: 'upgrade_available' });

      const callout = screen.getByTestId(
        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPGRADE_CALLOUT
      );
      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPDATE_STACK_BUTTON)
      ).toBeDisabled();
      expect(screen.getByTestId(LAUNCH)).toBeEnabled();
      expect(screen.getByText(/no CloudFormation stack on record/)).toBeInTheDocument();
      expect(screen.queryByTestId(REDEPLOY)).not.toBeInTheDocument();
      // Callout first, then Launch.
      const section = screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_SECTION);
      const domOrder = Array.from(section.querySelectorAll('*'));
      expect(domOrder.indexOf(callout)).toBeLessThan(domOrder.indexOf(screen.getByTestId(LAUNCH)));
    });

    it('is not offered while the upgrade callout shows with a stack ARN on record: Update is the action then', () => {
      setRead();

      renderFlyout({
        provider: 'aws',
        iacUpgradeStatus: 'upgrade_available',
        iacDeploymentId: VALID_STACK_ARN,
      });

      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPDATE_STACK_BUTTON)
      ).toBeEnabled();
      expect(screen.queryByTestId(LAUNCH)).not.toBeInTheDocument();
      expect(screen.queryByTestId(REDEPLOY)).not.toBeInTheDocument();
    });

    it('is not offered when the identity has no renderable integrations', () => {
      mockUseVerifyIacKey.mockReturnValue({
        data: { matches: true, outcome: 'not_checked', integrations: [] },
      } as unknown as ReturnType<typeof useVerifyIacKey>);

      renderFlyout({ provider: 'aws' });

      expect(screen.queryByTestId(LAUNCH)).not.toBeInTheDocument();
    });

    it('hands the hook the quick-create scaffold (cloud + package template URL) and no deploymentId', () => {
      setRead();

      renderFlyout({ provider: 'aws' });

      expect(mockUseGetPackageInfoByKeyQuery).toHaveBeenCalledWith(
        'aws',
        undefined,
        { full: true },
        // The URL only changes on a package upgrade: re-opening the flyout must not hit EPR.
        { enabled: true, staleTime: 5 * 60 * 1000 }
      );
      expect(mockGetAnyCloudConnectorIacTemplateUrl).toHaveBeenCalledWith(AWS_PACKAGE_ITEM);
      expect(mockUseCloudConnectorTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'aws',
          cloud: mockCloud,
          iacTemplateUrl: QUICK_CREATE_TEMPLATE_URL,
          integrations,
          deploymentId: undefined,
          staticTemplateFallback: false,
        })
      );
    });

    it('does not fetch the aws package outside the IaC section', () => {
      renderFlyout({
        provider: 'azure',
        cloudConnectorVars: {
          tenant_id: { value: 'tenant-123' },
          azure_credentials_cloud_connector_id: { value: 'subscription-123' },
        },
      });

      expect(mockUseGetPackageInfoByKeyQuery).toHaveBeenCalledWith(
        'aws',
        undefined,
        { full: true },
        expect.objectContaining({ enabled: false })
      );
    });

    it('is disabled when the package has no template URL to scaffold the quick-create link', () => {
      setRead();
      mockGetAnyCloudConnectorIacTemplateUrl.mockReturnValue(undefined);

      renderFlyout({ provider: 'aws' });

      expect(screen.getByTestId(LAUNCH)).toBeDisabled();
    });

    it('is disabled without the cloud context', () => {
      setRead();
      mockUseStartServices.mockReturnValue({
        analytics: { reportEvent: mockReportEvent },
        http: mockHttp,
        cloud: undefined,
        notifications: { toasts: { addWarning: mockAddWarning } },
      } as unknown as ReturnType<typeof useStartServices>);

      renderFlyout({ provider: 'aws' });

      expect(screen.getByTestId(LAUNCH)).toBeDisabled();
    });

    it('click renders, writes the key (moving the identity onto the generated template), re-checks once and reports launch_clicked', async () => {
      const user = userEvent.setup();
      setRead();
      mockUseCloudConnectorTemplate.mockImplementation(({ onTemplateRendered }) => ({
        launchButtonProps: {
          onClick: async () => {
            mockLaunchOnClick();
            onTemplateRendered?.({ key: 'sha256:new', integrations, ...RENDERED_BLUEPRINT });
          },
        },
        isDisabled: false,
        isGeneratingTemplate: false,
        clearIacConfirm: jest.fn(),
        isIacProvisionerEnabled: true,
      }));
      const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

      renderFlyout({ provider: 'aws' });
      await user.click(screen.getByTestId(LAUNCH));

      expect(mockLaunchOnClick).toHaveBeenCalledTimes(1);
      expect(mockReportEvent).toHaveBeenCalledWith(
        'iac_provisioner_key_check_action',
        expect.objectContaining({
          surface: 'flyout',
          action: 'launch_clicked',
          reason: 'no_key',
          hasDeploymentId: false,
        })
      );
      await waitFor(() => {
        expect(mockUpdateCloudConnector).toHaveBeenCalledWith(mockHttp, 'connector-123', {
          iac_key: 'sha256:new',
          iac_blueprint_id: 'federated-identity',
          iac_blueprint_version: '1.0.0',
        });
      });
      await waitFor(() => expect(mockSendVerify).toHaveBeenCalledWith('connector-123', {}));
      expect(mockSendVerify).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(invalidateQueries).toHaveBeenCalledWith(['get-cloud-connectors']);
      });
      expect(invalidateQueries).toHaveBeenCalledWith(['cloud-connector-usage', 'connector-123']);
    });

    it('shows the render error once under the button', () => {
      setRead();
      mockUseCloudConnectorTemplate.mockReturnValue({
        launchButtonProps: { onClick: mockLaunchOnClick },
        isDisabled: false,
        isGeneratingTemplate: false,
        clearIacConfirm: jest.fn(),
        templateGenerationError: 'boom',
        isIacProvisionerEnabled: true,
      });

      renderFlyout({ provider: 'aws' });

      expect(
        screen.getAllByTestId(
          CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_TEMPLATE_ERROR_CALLOUT
        )
      ).toHaveLength(1);
      expect(screen.getByText('boom')).toBeInTheDocument();
    });

    it('never persists a malformed ARN typed before Launch, and reports hasDeploymentId false', async () => {
      // Launch is offered exactly while the field is invalid; the render's write must not carry
      // the invalid value along with the key.
      const user = userEvent.setup();
      setRead();
      mockUseCloudConnectorTemplate.mockImplementation(({ onTemplateRendered }) => ({
        launchButtonProps: {
          onClick: async () => {
            onTemplateRendered?.({ key: 'sha256:new', integrations, ...RENDERED_BLUEPRINT });
          },
        },
        isDisabled: false,
        isGeneratingTemplate: false,
        clearIacConfirm: jest.fn(),
        isIacProvisionerEnabled: true,
      }));

      renderFlyout({ provider: 'aws' });
      fireEvent.change(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_DEPLOYMENT_ID_INPUT),
        { target: { value: 'not-an-arn' } }
      );
      await user.click(screen.getByTestId(LAUNCH));

      await waitFor(() => expect(mockUpdateCloudConnector).toHaveBeenCalledTimes(1));
      expect(mockUpdateCloudConnector).toHaveBeenCalledWith(mockHttp, 'connector-123', {
        iac_key: 'sha256:new',
        iac_blueprint_id: 'federated-identity',
        iac_blueprint_version: '1.0.0',
      });
      expect(mockUpdateCloudConnector.mock.calls[0][2]).not.toHaveProperty('iac_deployment_id');
      expect(mockReportEvent).toHaveBeenCalledWith(
        'iac_provisioner_key_check_action',
        expect.objectContaining({ action: 'launch_clicked', hasDeploymentId: false })
      );
    });
  });
});
