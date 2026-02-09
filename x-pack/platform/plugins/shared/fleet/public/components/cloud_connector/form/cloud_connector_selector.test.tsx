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
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import { SINGLE_ACCOUNT, ORGANIZATION_ACCOUNT } from '../../../../common';
import {
  AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ,
  getCloudConnectorEditIconTestSubj,
} from '../../../../common/services/cloud_connectors/test_subjects';

import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';

import { CloudConnectorSelector } from './cloud_connector_selector';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('../hooks/use_get_cloud_connectors');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseGetCloudConnectors = useGetCloudConnectors as jest.MockedFunction<
  typeof useGetCloudConnectors
>;

describe('CloudConnectorSelector', () => {
  let queryClient: QueryClient;
  const mockSetCredentials = jest.fn();

  const mockCloudConnectors = [
    {
      id: 'connector-1',
      name: 'AWS Connector 1',
      cloudProvider: 'aws',
      accountType: SINGLE_ACCOUNT,
      vars: {
        role_arn: { value: 'arn:aws:iam::123456789012:role/Role1' },
        external_id: { value: 'external-id-1' },
      },
      packagePolicyCount: 2,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
    {
      id: 'connector-2',
      name: 'AWS Connector 2',
      cloudProvider: 'aws',
      accountType: ORGANIZATION_ACCOUNT,
      vars: {
        role_arn: { value: 'arn:aws:iam::123456789012:role/Role2' },
        external_id: { value: 'external-id-2' },
      },
      packagePolicyCount: 1,
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
          navigateToApp: jest.fn(),
        },
      },
    } as unknown as ReturnType<typeof useKibana>);

    mockUseGetCloudConnectors.mockReturnValue({
      data: mockCloudConnectors,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetCloudConnectors>);

    mockSetCredentials.mockClear();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderSelector = (props = {}) => {
    const defaultProps = {
      provider: 'aws' as const,
      cloudConnectorId: undefined,
      credentials: {},
      setCredentials: mockSetCredentials,
      ...props,
    };

    return render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <CloudConnectorSelector {...defaultProps} />
        </QueryClientProvider>
      </I18nProvider>
    );
  };

  it('should render cloud connector selector', () => {
    renderSelector();

    expect(screen.getByText('Cloud Connector Name')).toBeInTheDocument();
  });

  it('should display connectors in dropdown', async () => {
    const user = userEvent.setup();
    renderSelector();

    const selector = screen.getByTestId(AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ);
    await user.click(selector);

    await waitFor(() => {
      expect(screen.getByText('AWS Connector 1')).toBeInTheDocument();
      expect(screen.getByText('AWS Connector 2')).toBeInTheDocument();
    });
  });

  it('should display edit icon when connector is selected', () => {
    renderSelector({
      cloudConnectorId: 'connector-1',
    });

    expect(
      screen.getByTestId(getCloudConnectorEditIconTestSubj('connector-1'))
    ).toBeInTheDocument();
  });

  it('should open flyout when clicking edit icon on selected connector', async () => {
    const user = userEvent.setup();
    renderSelector({
      cloudConnectorId: 'connector-1',
    });

    const editIcon = screen.getByTestId(getCloudConnectorEditIconTestSubj('connector-1'));
    await user.click(editIcon);

    await waitFor(() => {
      expect(screen.getByTestId('cloudConnectorPoliciesFlyout')).toBeInTheDocument();
    });
  });

  it('should call setCredentials when selecting a connector', async () => {
    const user = userEvent.setup();
    renderSelector();

    const selector = screen.getByTestId(AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ);
    await user.click(selector);

    await waitFor(() => {
      expect(screen.getByText('AWS Connector 1')).toBeInTheDocument();
    });

    await user.click(screen.getByText('AWS Connector 1'));

    expect(mockSetCredentials).toHaveBeenCalledWith({
      roleArn: 'arn:aws:iam::123456789012:role/Role1',
      externalId: 'external-id-1',
      cloudConnectorId: 'connector-1',
    });
  });

  it('should display selected connector', () => {
    renderSelector({
      cloudConnectorId: 'connector-1',
    });

    expect(screen.getByText('AWS Connector 1')).toBeInTheDocument();
  });

  it('should not call setCredentials when clicking edit icon', async () => {
    const user = userEvent.setup();
    renderSelector({
      cloudConnectorId: 'connector-1',
    });

    const editIcon = screen.getByTestId(getCloudConnectorEditIconTestSubj('connector-1'));
    await user.click(editIcon);

    // Edit icon click should not trigger connector selection
    expect(mockSetCredentials).not.toHaveBeenCalled();
  });

  describe('AccountBadge rendering', () => {
    it('should render Single Account badge for single account type connector', () => {
      renderSelector({
        cloudConnectorId: 'connector-1',
      });

      expect(screen.getByText('Single Account')).toBeInTheDocument();
    });

    it('should render Organization badge for organization account type connector', () => {
      renderSelector({
        cloudConnectorId: 'connector-2',
      });

      expect(screen.getByText('Organization')).toBeInTheDocument();
    });

    it('should display account badges in dropdown options', async () => {
      const user = userEvent.setup();
      renderSelector();

      const selector = screen.getByTestId(AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ);
      await user.click(selector);

      await waitFor(() => {
        expect(screen.getByText('AWS Connector 1')).toBeInTheDocument();
        expect(screen.getByText('AWS Connector 2')).toBeInTheDocument();
        // Both badges should be visible in the dropdown
        expect(screen.getByText('Single Account')).toBeInTheDocument();
        expect(screen.getByText('Organization')).toBeInTheDocument();
      });
    });

    it('should not render badge when accountType is undefined', () => {
      const connectorsWithoutAccountType = [
        {
          ...mockCloudConnectors[0],
          accountType: undefined,
        },
      ];

      mockUseGetCloudConnectors.mockReturnValue({
        data: connectorsWithoutAccountType,
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useGetCloudConnectors>);

      renderSelector({
        cloudConnectorId: 'connector-1',
      });

      expect(screen.queryByText('Single Account')).not.toBeInTheDocument();
      expect(screen.queryByText('Organization')).not.toBeInTheDocument();
    });
  });

  describe('IntegrationCountBadge rendering', () => {
    it('should display integration count badges in dropdown options', async () => {
      const user = userEvent.setup();
      renderSelector();

      const selector = screen.getByTestId(AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ);
      await user.click(selector);

      await waitFor(() => {
        // Badge should show plural for count > 1
        expect(screen.getByText('Used by 2 integrations')).toBeInTheDocument();
        // Badge should show singular for count = 1
        expect(screen.getByText('Used by 1 integration')).toBeInTheDocument();
      });
    });

    it('should display zero integrations badge when packagePolicyCount is 0', async () => {
      const connectorsWithZeroCount = [
        {
          ...mockCloudConnectors[0],
          packagePolicyCount: 0,
        },
      ];

      mockUseGetCloudConnectors.mockReturnValue({
        data: connectorsWithZeroCount,
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useGetCloudConnectors>);

      const user = userEvent.setup();
      renderSelector();

      const selector = screen.getByTestId(AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ);
      await user.click(selector);

      await waitFor(() => {
        expect(screen.getByText('Used by 0 integrations')).toBeInTheDocument();
      });
    });
  });

  describe('Account Type Filtering', () => {
    it('should call useGetCloudConnectors with correct filter options', () => {
      renderSelector({
        accountType: SINGLE_ACCOUNT,
      });

      expect(mockUseGetCloudConnectors).toHaveBeenCalledWith({
        cloudProvider: 'aws',
        accountType: SINGLE_ACCOUNT,
      });
    });

    it('should call useGetCloudConnectors without accountType when not provided', () => {
      renderSelector();

      expect(mockUseGetCloudConnectors).toHaveBeenCalledWith({
        cloudProvider: 'aws',
        accountType: undefined,
      });
    });
  });
});
