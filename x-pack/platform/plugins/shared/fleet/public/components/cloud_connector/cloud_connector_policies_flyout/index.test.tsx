/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
import { useUpdateCloudConnector } from '../hooks/use_update_cloud_connector';
import { useDeleteCloudConnector } from '../hooks/use_delete_cloud_connector';

import { CloudConnectorPoliciesFlyout } from '.';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('../hooks/use_cloud_connector_usage');
jest.mock('../hooks/use_update_cloud_connector');
jest.mock('../hooks/use_delete_cloud_connector');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseCloudConnectorUsage = useCloudConnectorUsage as jest.MockedFunction<
  typeof useCloudConnectorUsage
>;
const mockUseUpdateCloudConnector = useUpdateCloudConnector as jest.MockedFunction<
  typeof useUpdateCloudConnector
>;
const mockUseDeleteCloudConnector = useDeleteCloudConnector as jest.MockedFunction<
  typeof useDeleteCloudConnector
>;

describe('CloudConnectorPoliciesFlyout', () => {
  let queryClient: QueryClient;
  const mockOnClose = jest.fn();
  const mockNavigateToApp = jest.fn();

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

    mockOnClose.mockClear();
    mockNavigateToApp.mockClear();
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
    expect(screen.getByText('No integrations using this cloud connector')).toBeInTheDocument();
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
    const user = userEvent.setup();
    renderFlyout();

    const nameInput = screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.NAME_INPUT);
    const saveButton = screen.getByTestId(
      CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.FOOTER_SAVE_BUTTON
    );

    expect(saveButton).toBeDisabled();

    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');

    expect(saveButton).toBeEnabled();
  });

  it('should call mutate when save button is clicked', async () => {
    const user = userEvent.setup();
    const mockMutate = jest.fn();
    mockUseUpdateCloudConnector.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    } as unknown as ReturnType<typeof useUpdateCloudConnector>);

    renderFlyout();

    const nameInput = screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.NAME_INPUT);
    const saveButton = screen.getByTestId(
      CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.FOOTER_SAVE_BUTTON
    );

    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');
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
    ).toHaveTextContent('Cloud Connector ID: subscription-123');
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
        screen.getByText('Cloud Connector Name must be 255 characters or less')
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

      expect(screen.getByText('Cloud Connector Name is required')).toBeInTheDocument();
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
      expect(screen.queryByText('Cloud Connector Name is required')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Cloud Connector Name must be 255 characters or less')
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
        screen.queryByText('Cloud Connector Name must be 255 characters or less')
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
      const confirmButton = screen.getByText('Delete connector');
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
});
