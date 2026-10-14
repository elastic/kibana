/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { MockChromeContextProvider } from '@kbn/core-chrome-browser-context-mocks';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { ElasticInferenceServiceModelsHeader } from './header';
import { useEisModels } from '../../hooks/use_eis_models';
import { useKibana } from '../../hooks/use_kibana';
import { useRegionPolicy } from '../../hooks/use_region_policy';

jest.mock('../../hooks/use_kibana');
jest.mock('../../hooks/use_region_policy');
jest.mock('../../hooks/use_eis_models');

const mockUseKibana = useKibana as jest.Mock;
const mockUseRegionPolicy = useRegionPolicy as jest.Mock;
const mockUseEisModels = useEisModels as jest.Mock;

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
      <EuiThemeProvider>
        <I18nProvider>
          <MockChromeContextProvider>
            <ElasticInferenceServiceModelsHeader {...props} />
          </MockChromeContextProvider>
        </I18nProvider>
      </EuiThemeProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue(mockKibanaReturn());
    mockUseRegionPolicy.mockReturnValue({ data: null });
    mockUseEisModels.mockReturnValue({ data: [] });
  });

  it('renders the page title and description', () => {
    renderHeader();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Elastic Inference Service'
    );
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.description)).toHaveTextContent(
      'Manage models and endpoints for Elastic Inference Service'
    );
  });

  describe('Restricted regions badge', () => {
    it('shows when a region policy is set', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2026-01-01T00:00:00Z' },
      });
      renderHeader();
      expect(screen.getByTestId('restrictedRegionsBadge')).toHaveTextContent('Restricted regions');
    });

    it('hidden when no region policy is set', () => {
      renderHeader();
      expect(screen.queryByTestId('restrictedRegionsBadge')).not.toBeInTheDocument();
    });

    it('hidden when the region policy has no allowed geos or regions', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: {}, created_at: '2026-01-01T00:00:00Z' },
      });
      renderHeader();
      expect(screen.queryByTestId('restrictedRegionsBadge')).not.toBeInTheDocument();
    });

    it('is read-only when manage capability is false', () => {
      mockUseKibana.mockReturnValue(mockKibanaReturn({ manage: false }));
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2026-01-01T00:00:00Z' },
      });
      renderHeader();
      expect(screen.getByTestId('restrictedRegionsBadge')).toBeInTheDocument();
      expect(screen.queryByTestId('eisManageRegionsButton')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('restrictedRegionsBadge'));
      expect(screen.queryByTestId('restrictedRegionsEditButton')).not.toBeInTheDocument();
    });
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
      expect(
        screen.getByTestId(
          'searchInferenceEndpointsElasticInferenceServiceModelsHeaderViewCloudUsageButton'
        )
      ).toBeInTheDocument();
    });

    it('hidden when cloud is disabled', async () => {
      renderHeader();
      await openAppMenuOverflow();
      expect(
        screen.queryByTestId(
          'searchInferenceEndpointsElasticInferenceServiceModelsHeaderViewCloudUsageButton'
        )
      ).not.toBeInTheDocument();
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
      await openAppMenuOverflow();
      await waitFor(() => {
        expect(
          screen.queryByTestId(
            'searchInferenceEndpointsElasticInferenceServiceModelsHeaderViewCloudUsageButton'
          )
        ).not.toBeInTheDocument();
      });
    });
  });
});
