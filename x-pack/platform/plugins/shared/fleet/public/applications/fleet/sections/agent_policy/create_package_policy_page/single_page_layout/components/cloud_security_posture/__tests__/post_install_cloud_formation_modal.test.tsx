/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { PostInstallCloudFormationModal } from '../post_install_cloud_formation_modal';
import { useAgentPolicyWithPackagePolicies } from '../../../../../../../../../components/agent_enrollment_flyout/hooks';
import { useFleetServerHostsForPolicy } from '../../../../../../../../../hooks';

import { useCreateCloudFormationUrl } from '../../../../../../../../../components/cloud_security_posture/hooks';

import { mockAgentPolicy, mockPackagePolicy } from './mockData';

jest.mock('@tanstack/react-query');
jest.mock('../../../../../../../../../components/agent_enrollment_flyout/hooks');
jest.mock('../../../../../../../../../hooks');
jest.mock('../../../../../../../../../components/cloud_security_posture/hooks');

describe('PostInstallCloudFormationModal', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeAll(() => {
    (useAgentPolicyWithPackagePolicies as jest.Mock).mockReturnValue({
      agentPolicyWithPackagePolicies: null,
    });

    (useFleetServerHostsForPolicy as jest.Mock).mockReturnValue({
      fleetServerHost: 'https://any-hostname:8220',
      isLoadingInitialRequest: false,
    });

    (useCreateCloudFormationUrl as jest.Mock).mockReturnValue({
      cloudFormationUrl: 'console.aws.amazon.com/cloudformation',
    });
  });

  it('should render the modal with confirm button enabled', () => {
    (useQuery as jest.Mock).mockReturnValueOnce({
      data: {
        data: {
          items: [{ api_key: 'test-api-key' }],
        },
      },
      isLoading: true,
    });

    render(
      <IntlProvider>
        <PostInstallCloudFormationModal
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          agentPolicy={mockAgentPolicy}
          packagePolicy={mockPackagePolicy}
        />
      </IntlProvider>
    );

    expect(screen.getByTestId('confirmCloudFormationModalConfirmButton')).toBeInTheDocument();
  });

  it('should render the modal with confirm button disabled', () => {
    (useQuery as jest.Mock).mockReturnValueOnce({
      data: {
        data: {
          items: [{ api_key: 'test-api-key' }],
        },
      },
      isLoading: true,
    });

    render(
      <IntlProvider>
        <PostInstallCloudFormationModal
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          agentPolicy={mockAgentPolicy}
          packagePolicy={mockPackagePolicy}
        />
      </IntlProvider>
    );

    expect(screen.getByTestId('confirmCloudFormationModalConfirmButton')).toBeDisabled();
  });

  it('should open correct cloudFormation URL', () => {
    // Mock window.open
    const mockWindowOpen = jest.fn();
    window.open = mockWindowOpen;

    (useQuery as jest.Mock).mockReturnValueOnce({
      data: {
        data: {
          items: [{ api_key: 'test-api-key' }],
        },
      },
      isLoading: false,
    });

    render(
      <IntlProvider>
        <PostInstallCloudFormationModal
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          agentPolicy={mockAgentPolicy}
          packagePolicy={mockPackagePolicy}
        />
      </IntlProvider>
    );

    const confirmButton = screen.getByTestId('confirmCloudFormationModalConfirmButton');
    fireEvent.click(confirmButton);

    expect(mockWindowOpen).toHaveBeenCalledTimes(1);
    expect(mockWindowOpen).toHaveBeenCalledWith('console.aws.amazon.com/cloudformation');
  });
});
