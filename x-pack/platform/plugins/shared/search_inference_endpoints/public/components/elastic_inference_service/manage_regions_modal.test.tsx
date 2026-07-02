/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ManageRegionsModal } from './manage_regions_modal';
import {
  useRegionPolicy,
  useSaveRegionPolicy,
  useDeleteRegionPolicy,
} from '../../hooks/use_region_policy';
import { useEisModels } from '../../hooks/use_eis_models';

jest.mock('../../hooks/use_region_policy');
jest.mock('../../hooks/use_eis_models');

const mockUseRegionPolicy = useRegionPolicy as jest.Mock;
const mockUseSaveRegionPolicy = useSaveRegionPolicy as jest.Mock;
const mockUseDeleteRegionPolicy = useDeleteRegionPolicy as jest.Mock;
const mockUseEisModels = useEisModels as jest.Mock;

const mockSaveMutate = jest.fn();
const mockDeleteMutate = jest.fn();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiThemeProvider>
    <I18nProvider>{children}</I18nProvider>
  </EuiThemeProvider>
);

const endpointWithRegions = {
  inference_id: '.test-model',
  service: 'elastic' as const,
  task_type: 'text_embedding' as const,
  service_settings: { model_id: 'test-model' },
  metadata: {
    availability_regions: {
      regions: [
        { csp: 'aws', region: 'us-east-1' },
        { csp: 'aws', region: 'eu-west-1' },
      ],
      geos: ['us', 'eu'],
    },
  },
};

describe('ManageRegionsModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSaveRegionPolicy.mockReturnValue({
      mutate: mockSaveMutate,
      isLoading: false,
    });
    mockUseDeleteRegionPolicy.mockReturnValue({
      mutate: mockDeleteMutate,
      isLoading: false,
    });
  });

  describe('loading state', () => {
    it('renders a loading spinner while region policy is fetching', () => {
      mockUseRegionPolicy.mockReturnValue({ data: undefined, isLoading: true });
      mockUseEisModels.mockReturnValue({ data: [], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      expect(screen.getByTestId('manageRegionsLoading')).toBeInTheDocument();
    });

    it('renders a loading spinner while eis models are fetching', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: undefined, isLoading: true });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      expect(screen.getByTestId('manageRegionsLoading')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows a warning callout when no regions are available', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      expect(screen.getByTestId('manageRegionsNoRegions')).toBeInTheDocument();
      expect(screen.getByText('No regions available')).toBeInTheDocument();
    });
  });

  describe('region tree', () => {
    it('renders the tree when regions are available from eis endpoints', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [endpointWithRegions], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      expect(screen.getByTestId('manageRegionsTree')).toBeInTheDocument();
      expect(screen.getByText('Amazon Web Services (AWS)')).toBeInTheDocument();
    });

    it('pre-checks regions that match the current policy', async () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_regions: [{ csp: 'aws', region: 'us-east-1' }] } },
        isLoading: false,
      });
      mockUseEisModels.mockReturnValue({ data: [endpointWithRegions], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      await waitFor(() => {
        const checkbox = screen.getByTestId(
          'manageRegionsCheckbox-aws::us-east-1'
        ) as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
      });

      const uncheckedBox = screen.getByTestId(
        'manageRegionsCheckbox-aws::eu-west-1'
      ) as HTMLInputElement;
      expect(uncheckedBox.checked).toBe(false);
    });

    it('toggles a checkbox when clicked', async () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [endpointWithRegions], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      const checkbox = screen.getByTestId(
        'manageRegionsCheckbox-aws::us-east-1'
      ) as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      fireEvent.click(checkbox);
      await waitFor(() => expect(checkbox.checked).toBe(true));
    });
  });

  describe('Save button', () => {
    it('calls savePolicy with only the checked regions and then closes', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [endpointWithRegions], isLoading: false });

      mockSaveMutate.mockImplementation(
        (_body: unknown, { onSuccess }: { onSuccess: () => void }) => {
          onSuccess();
        }
      );

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('manageRegionsSaveButton'));

      expect(mockSaveMutate).toHaveBeenCalledWith(
        { allowed_regions: [] },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
      expect(onClose).toHaveBeenCalled();
    });

    it('saves only the checked regions', async () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [endpointWithRegions], isLoading: false });

      mockSaveMutate.mockImplementation(
        (_body: unknown, { onSuccess }: { onSuccess: () => void }) => {
          onSuccess();
        }
      );

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      const checkbox = screen.getByTestId(
        'manageRegionsCheckbox-aws::us-east-1'
      ) as HTMLInputElement;
      fireEvent.click(checkbox);
      await waitFor(() => expect(checkbox.checked).toBe(true));

      fireEvent.click(screen.getByTestId('manageRegionsSaveButton'));

      expect(mockSaveMutate).toHaveBeenCalledWith(
        { allowed_regions: [{ csp: 'aws', region: 'us-east-1' }] },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });
  });

  describe('Cancel button', () => {
    it('calls onClose when cancel is clicked', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('manageRegionsCancelButton'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Remove restrictions button', () => {
    it('calls deletePolicy and closes on success', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [], isLoading: false });

      mockDeleteMutate.mockImplementation(
        (_arg: unknown, { onSuccess }: { onSuccess: () => void }) => {
          onSuccess();
        }
      );

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('manageRegionsRemoveRestrictionsButton'));
      expect(mockDeleteMutate).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
