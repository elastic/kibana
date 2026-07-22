/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { ElasticInferenceServiceModelsHeader } from './header';
import { useKibana } from '../../hooks/use_kibana';
import { docLinks } from '../../../common/doc_links';
import { INFERENCE_PREFERENCES_FEATURE_FLAG_ID } from '../../../common/constants';

jest.mock('../../hooks/use_kibana');
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useUiSetting: jest.fn((key: string, defaultValue?: unknown) => defaultValue),
}));

const mockUseUiSetting = useUiSetting as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;

describe('ElasticInferenceServiceModelsHeader', () => {
  const onManageRegions = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUiSetting.mockImplementation((key: string, defaultValue?: unknown) => {
      if (key === INFERENCE_PREFERENCES_FEATURE_FLAG_ID) return false;
      return defaultValue;
    });
    mockUseKibana.mockReturnValue({
      services: {
        cloud: { isCloudEnabled: false },
      },
    });
  });

  it('renders the page title and description', () => {
    const { getByText } = render(
      <ElasticInferenceServiceModelsHeader onManageRegions={onManageRegions} />
    );
    expect(getByText('Elastic Inference Service')).toBeInTheDocument();
    expect(
      getByText('Manage models and endpoints for Elastic Inference Service')
    ).toBeInTheDocument();
  });

  it('renders a documentation link pointing to the correct href', () => {
    docLinks.elasticInferenceService = 'https://elastic.co/eis';
    const { getByRole } = render(
      <ElasticInferenceServiceModelsHeader onManageRegions={onManageRegions} />
    );
    const link = getByRole('link', { name: /documentation/i });
    expect(link).toHaveAttribute('href', 'https://elastic.co/eis');
    expect(link).toHaveAttribute('target', '_blank');
  });

  describe('Manage regions button', () => {
    it('shows when inference preferences FF is enabled', () => {
      mockUseUiSetting.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === INFERENCE_PREFERENCES_FEATURE_FLAG_ID) return true;
        return defaultValue;
      });
      const { getByTestId } = render(
        <ElasticInferenceServiceModelsHeader onManageRegions={onManageRegions} />
      );
      expect(getByTestId('eisManageRegionsButton')).toBeInTheDocument();
    });

    it('hidden when inference preferences FF is disabled', () => {
      const { queryByTestId } = render(
        <ElasticInferenceServiceModelsHeader onManageRegions={onManageRegions} />
      );
      expect(queryByTestId('eisManageRegionsButton')).not.toBeInTheDocument();
    });

    it('calls onManageRegions when button is clicked', () => {
      mockUseUiSetting.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === INFERENCE_PREFERENCES_FEATURE_FLAG_ID) return true;
        return defaultValue;
      });
      const { getByTestId } = render(
        <ElasticInferenceServiceModelsHeader onManageRegions={onManageRegions} />
      );

      fireEvent.click(getByTestId('eisManageRegionsButton'));
      expect(onManageRegions).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cloud usage button', () => {
    it('shows when cloud is enabled and billingUrl is available', async () => {
      mockUseKibana.mockReturnValue({
        services: {
          cloud: {
            isCloudEnabled: true,
            getPrivilegedUrls: jest
              .fn()
              .mockResolvedValue({ billingUrl: 'https://cloud.elastic.co/billing/' }),
          },
        },
      });
      const { getByText } = render(
        <ElasticInferenceServiceModelsHeader onManageRegions={onManageRegions} />
      );
      await waitFor(() => {
        expect(getByText('View Cloud usage')).toBeInTheDocument();
      });
    });

    it('hidden when cloud is disabled', () => {
      const { queryByText } = render(
        <ElasticInferenceServiceModelsHeader onManageRegions={onManageRegions} />
      );
      expect(queryByText('View Cloud usage')).not.toBeInTheDocument();
    });

    it('hidden when cloud is enabled but billingUrl is not available', async () => {
      mockUseKibana.mockReturnValue({
        services: {
          cloud: {
            isCloudEnabled: true,
            getPrivilegedUrls: jest.fn().mockResolvedValue({}),
          },
        },
      });
      const { queryByText } = render(
        <ElasticInferenceServiceModelsHeader onManageRegions={onManageRegions} />
      );
      await waitFor(() => {
        expect(queryByText('View Cloud usage')).not.toBeInTheDocument();
      });
    });
  });
});
