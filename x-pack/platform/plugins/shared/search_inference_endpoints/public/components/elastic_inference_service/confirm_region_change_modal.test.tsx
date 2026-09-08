/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ConfirmRegionChangeModal } from './confirm_region_change_modal';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiThemeProvider>
    <I18nProvider>{children}</I18nProvider>
  </EuiThemeProvider>
);

describe('ConfirmRegionChangeModal', () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('common behaviour', () => {
    it('renders "Confirm region change" title in regions mode', () => {
      render(
        <Wrapper>
          <ConfirmRegionChangeModal
            mode="regions"
            selectedRegions={[]}
            selectedGeos={[]}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      expect(screen.getByTestId('confirmRegionChangeModal')).toBeInTheDocument();
      expect(screen.getByText('Confirm region change')).toBeInTheDocument();
    });

    it('renders "Confirm geographies change" title in geo mode', () => {
      render(
        <Wrapper>
          <ConfirmRegionChangeModal
            mode="geo"
            selectedRegions={[]}
            selectedGeos={[]}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      expect(screen.getByText('Confirm geographies change')).toBeInTheDocument();
    });

    it('calls onConfirm when Save button is clicked', () => {
      render(
        <Wrapper>
          <ConfirmRegionChangeModal
            mode="regions"
            selectedRegions={[]}
            selectedGeos={[]}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when Cancel button is clicked', () => {
      render(
        <Wrapper>
          <ConfirmRegionChangeModal
            mode="regions"
            selectedRegions={[]}
            selectedGeos={[]}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('confirmModalCancelButton'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('disables the Save button and shows loading when isSaving is true', () => {
      render(
        <Wrapper>
          <ConfirmRegionChangeModal
            mode="regions"
            selectedRegions={[]}
            selectedGeos={[]}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving
          />
        </Wrapper>
      );

      expect(screen.getByTestId('confirmModalConfirmButton')).toBeDisabled();
    });
  });

  describe('regions mode', () => {
    const selectedRegions = [
      { csp: 'aws', region: 'us-east-1', geo: 'us' },
      { csp: 'gcp', region: 'europe-west1', geo: 'eu' },
    ];

    it('shows "pending allowed regions" heading', () => {
      render(
        <Wrapper>
          <ConfirmRegionChangeModal
            mode="regions"
            selectedRegions={selectedRegions}
            selectedGeos={[]}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      expect(screen.getByText('Your pending allowed regions:')).toBeInTheDocument();
    });

    it('lists each selected region in the modal body', () => {
      render(
        <Wrapper>
          <ConfirmRegionChangeModal
            mode="regions"
            selectedRegions={selectedRegions}
            selectedGeos={[]}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      const list = screen.getByTestId('confirmModalRegionList');
      expect(list).toBeInTheDocument();
      // One <li> per selected region
      expect(list.querySelectorAll('li')).toHaveLength(selectedRegions.length);
      // Each item shows the cloud provider in uppercase
      expect(list.textContent).toMatch(/AWS/);
      expect(list.textContent).toMatch(/GCP/);
    });

    it('does not show geo list in regions mode', () => {
      render(
        <Wrapper>
          <ConfirmRegionChangeModal
            mode="regions"
            selectedRegions={selectedRegions}
            selectedGeos={['eu', 'us']}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      expect(screen.queryByTestId('confirmModalGeoList')).not.toBeInTheDocument();
    });
  });

  describe('geo mode', () => {
    const selectedGeos = ['eu', 'us'];

    it('shows "pending allowed geo zones" heading', () => {
      render(
        <Wrapper>
          <ConfirmRegionChangeModal
            mode="geo"
            selectedRegions={[]}
            selectedGeos={selectedGeos}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      expect(screen.getByText('Your pending allowed geographies:')).toBeInTheDocument();
    });

    it('lists each selected geo display name in the modal body', () => {
      render(
        <Wrapper>
          <ConfirmRegionChangeModal
            mode="geo"
            selectedRegions={[]}
            selectedGeos={selectedGeos}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      expect(screen.getByTestId('confirmModalGeoList')).toBeInTheDocument();
      expect(screen.getByText('Europe')).toBeInTheDocument();
      expect(screen.getByText('North America')).toBeInTheDocument();
    });

    it('does not show regions list in geo mode', () => {
      render(
        <Wrapper>
          <ConfirmRegionChangeModal
            mode="geo"
            selectedRegions={[{ csp: 'aws', region: 'us-east-1', geo: 'us' }]}
            selectedGeos={selectedGeos}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isSaving={false}
          />
        </Wrapper>
      );

      expect(screen.queryByTestId('confirmModalRegionList')).not.toBeInTheDocument();
    });
  });
});
