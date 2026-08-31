/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MockChromeContextProvider } from '@kbn/core-chrome-browser-context-mocks';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { ElasticInferenceServiceModelsHeader } from './header';
import { useKibana } from '../../hooks/use_kibana';

jest.mock('../../hooks/use_kibana');

const mockUseKibana = useKibana as jest.Mock;

const mockKibanaReturn = (options?: { manage?: boolean; cloud?: Record<string, unknown> }) => {
  const manage = options?.manage ?? true;
  const cloud = options?.cloud ?? { isCloudEnabled: false };

  return {
    services: {
      cloud,
      application: {
        capabilities: {
          searchInferenceEndpoints: { show: true, manage },
        },
      },
    },
  };
};

describe('ElasticInferenceServiceModelsHeader', () => {
  const onManageRegions = jest.fn();

  const renderHeader = (
    props: React.ComponentProps<typeof ElasticInferenceServiceModelsHeader> = { onManageRegions }
  ) =>
    render(
      <MockChromeContextProvider>
        <ElasticInferenceServiceModelsHeader {...props} />
      </MockChromeContextProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue(mockKibanaReturn());
  });

  it('renders the page title and description', () => {
    renderHeader();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Elastic Inference Service'
    );
    expect(
      screen.getByText('Manage models and endpoints for Elastic Inference Service')
    ).toBeInTheDocument();
  });

  describe('Manage regions button', () => {
    it('shows when manage capability is true', async () => {
      renderHeader();
      await openAppMenuOverflow();
      expect(screen.getByTestId('eisManageRegionsButton')).toBeInTheDocument();
    });

    it('hidden when manage capability is false', () => {
      mockUseKibana.mockReturnValue(mockKibanaReturn({ manage: false }));
      renderHeader();
      expect(screen.queryByTestId('eisManageRegionsButton')).not.toBeInTheDocument();
    });

    it('calls onManageRegions when button is clicked', async () => {
      renderHeader();
      await openAppMenuOverflow();
      fireEvent.click(screen.getByTestId('eisManageRegionsButton'));
      expect(onManageRegions).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cloud usage button', () => {
    it('shows when cloud is enabled and billingUrl is available', async () => {
      mockUseKibana.mockReturnValue(
        mockKibanaReturn({
          cloud: {
            isCloudEnabled: true,
            getPrivilegedUrls: jest
              .fn()
              .mockResolvedValue({ billingUrl: 'https://cloud.elastic.co/billing/' }),
          },
        })
      );
      renderHeader();
      await openAppMenuOverflow();
      expect(await screen.findByText('View Cloud usage')).toBeInTheDocument();
    });

    it('hidden when cloud is disabled', async () => {
      renderHeader();
      await openAppMenuOverflow();
      expect(screen.queryByText('View Cloud usage')).not.toBeInTheDocument();
    });

    it('hidden when cloud is enabled but billingUrl is not available', async () => {
      mockUseKibana.mockReturnValue(
        mockKibanaReturn({
          cloud: {
            isCloudEnabled: true,
            getPrivilegedUrls: jest.fn().mockResolvedValue({}),
          },
        })
      );
      renderHeader();
      await waitFor(() => {
        expect(screen.queryByText('View Cloud usage')).not.toBeInTheDocument();
      });
    });
  });
});
