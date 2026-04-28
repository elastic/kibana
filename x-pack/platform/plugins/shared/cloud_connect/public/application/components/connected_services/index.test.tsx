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
import { of } from 'rxjs';
import { ConnectedServicesPage, type ConnectedServicesPageProps } from '.';
import { useCloudConnectedAppContext } from '../../app_context';

jest.mock('../../app_context');

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

describe('ConnectedServicesPage', () => {
  const mockRotateApiKey = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddDanger = jest.fn();

  const defaultProps: ConnectedServicesPageProps = {
    clusterDetails: {
      id: 'cluster-123',
      name: 'my-cluster',
      metadata: {
        organization_id: 'org-456',
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'user@example.com',
        subscription: 'active',
      },
      self_managed_cluster: {
        id: 'es-cluster-uuid',
        name: 'my-cluster',
        version: '8.15.0',
      },
      license: {
        type: 'platinum',
        uid: 'license-uid',
      },
      services: {
        eis: {
          enabled: false,
          support: { supported: true },
        },
        auto_ops: {
          enabled: false,
          support: { supported: true },
        },
      },
    },
    onServiceUpdate: jest.fn(),
    onDisconnect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRotateApiKey.mockResolvedValue({ data: { success: true } });

    mockUseCloudConnectedAppContext.mockReturnValue({
      hasConfigurePermission: true,
      notifications: {
        toasts: {
          addSuccess: mockAddSuccess,
          addDanger: mockAddDanger,
        },
      },
      docLinks: {
        links: {
          cloud: {
            cloudConnect: 'https://docs.example.com/cloud-connect',
          },
        },
      },
      telemetryService: {
        trackLinkClicked: jest.fn(),
      },
      apiService: {
        rotateApiKey: mockRotateApiKey,
        disconnectCluster: jest.fn().mockResolvedValue({ data: { success: true } }),
      },
      licensing: {
        license$: of({ type: 'platinum' }),
      },
    } as any);
  });

  describe('Rotate API key action', () => {
    it('should call rotateApiKey and show success toast on happy path', async () => {
      renderWithIntl(<ConnectedServicesPage {...defaultProps} />);

      // Open the actions popover
      const actionsButton = screen.getByRole('button', { name: /actions/i });
      await userEvent.click(actionsButton);

      // Click the rotate API key menu item
      const rotateMenuItem = await screen.findByRole('button', { name: /rotate api key/i });
      await userEvent.click(rotateMenuItem);

      await waitFor(() => {
        expect(mockRotateApiKey).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(mockAddSuccess).toHaveBeenCalledWith({
          title: 'API key rotated successfully',
        });
      });
    });

    it('should show error toast when rotate API key fails', async () => {
      mockRotateApiKey.mockResolvedValue({
        error: { message: 'Failed to rotate' },
      });

      renderWithIntl(<ConnectedServicesPage {...defaultProps} />);

      // Open the actions popover
      const actionsButton = screen.getByRole('button', { name: /actions/i });
      await userEvent.click(actionsButton);

      // Click the rotate API key menu item
      const rotateMenuItem = await screen.findByRole('button', { name: /rotate api key/i });
      await userEvent.click(rotateMenuItem);

      await waitFor(() => {
        expect(mockAddDanger).toHaveBeenCalledWith({
          title: 'Failed to rotate API key',
          text: 'Failed to rotate',
        });
      });
    });
  });
});
