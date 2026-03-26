/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ElasticInferenceServiceModelsHeader } from './header';
import { useKibana } from '../../hooks/use_kibana';
import { docLinks } from '../../../common/doc_links';

jest.mock('../../hooks/use_kibana');
const mockUseKibana = useKibana as jest.Mock;

describe('ElasticInferenceServiceModelsHeader', () => {
  beforeEach(() => {
    mockUseKibana.mockReturnValue({
      services: { cloud: { isCloudEnabled: false } },
    });
  });

  it('renders the page title and description', () => {
    const { getByText } = render(<ElasticInferenceServiceModelsHeader />);
    expect(getByText('Elastic Inference Service')).toBeInTheDocument();
    expect(
      getByText('Manage models and endpoints for Elastic Inference Service')
    ).toBeInTheDocument();
  });

  it('renders a documentation link pointing to the correct href', () => {
    docLinks.elasticInferenceService = 'https://elastic.co/eis';
    const { getByRole } = render(<ElasticInferenceServiceModelsHeader />);
    const link = getByRole('link', { name: /documentation/i });
    expect(link).toHaveAttribute('href', 'https://elastic.co/eis');
    expect(link).toHaveAttribute('target', '_blank');
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
      const { getByText } = render(<ElasticInferenceServiceModelsHeader />);
      await waitFor(() => {
        expect(getByText('View Cloud usage')).toBeInTheDocument();
      });
    });

    it('hidden when cloud is disabled', () => {
      const { queryByText } = render(<ElasticInferenceServiceModelsHeader />);
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
      const { queryByText } = render(<ElasticInferenceServiceModelsHeader />);
      await waitFor(() => {
        expect(queryByText('View Cloud usage')).not.toBeInTheDocument();
      });
    });
  });
});
