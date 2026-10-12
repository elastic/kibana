/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ElasticInferenceService } from './elastic_inference_service';
import { useEisPageState } from '../hooks/use_eis_page_state';

jest.mock('../hooks/use_breadcrumbs');
jest.mock('../hooks/use_eis_page_state');
jest.mock('./elastic_inference_service/header', () => ({
  ElasticInferenceServiceModelsHeader: () => <div data-test-subj="eisModelsHeaderMock" />,
}));
jest.mock('./elastic_inference_service/elastic_inference_service_models_page', () => ({
  ElasticInferenceServiceModelsPage: ({
    pageState,
    isCloudConnectPromoVisible,
  }: {
    pageState: string;
    isCloudConnectPromoVisible: boolean;
  }) => (
    <div
      data-test-subj="eisModelsPageMock"
      data-page-state={pageState}
      data-promo-visible={String(isCloudConnectPromoVisible)}
    />
  ),
}));

const mockUseEisPageState = useEisPageState as jest.Mock;

describe('ElasticInferenceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the header when models are shown', () => {
    mockUseEisPageState.mockReturnValue({ pageState: 'models', isCloudConnectPromoVisible: false });
    const { getByTestId } = render(<ElasticInferenceService />);
    expect(getByTestId('eisModelsHeaderMock')).toBeInTheDocument();
    expect(getByTestId('eisModelsPageMock')).toBeInTheDocument();
  });

  it('hides the header when the service is unavailable', () => {
    mockUseEisPageState.mockReturnValue({
      pageState: 'unavailable',
      isCloudConnectPromoVisible: false,
    });
    const { queryByTestId, getByTestId } = render(<ElasticInferenceService />);
    expect(queryByTestId('eisModelsHeaderMock')).not.toBeInTheDocument();
    expect(getByTestId('eisModelsPageMock')).toHaveAttribute('data-page-state', 'unavailable');
  });

  it('hides the header on the self-managed empty state', () => {
    mockUseEisPageState.mockReturnValue({
      pageState: 'selfManagedEmpty',
      isCloudConnectPromoVisible: true,
    });
    const { queryByTestId, getByTestId } = render(<ElasticInferenceService />);
    expect(queryByTestId('eisModelsHeaderMock')).not.toBeInTheDocument();
    expect(getByTestId('eisModelsPageMock')).toHaveAttribute('data-page-state', 'selfManagedEmpty');
    expect(getByTestId('eisModelsPageMock')).toHaveAttribute('data-promo-visible', 'true');
  });

  it('renders the header when the service is disabled', () => {
    mockUseEisPageState.mockReturnValue({
      pageState: 'serviceDisabled',
      isCloudConnectPromoVisible: false,
    });
    const { getByTestId } = render(<ElasticInferenceService />);
    expect(getByTestId('eisModelsHeaderMock')).toBeInTheDocument();
    expect(getByTestId('eisModelsPageMock')).toHaveAttribute('data-page-state', 'serviceDisabled');
  });
});
