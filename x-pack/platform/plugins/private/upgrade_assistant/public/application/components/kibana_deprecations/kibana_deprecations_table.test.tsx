/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { I18nProvider } from '@kbn/i18n-react';

import type { KibanaDeprecationDetails } from './kibana_deprecations';
import { KibanaDeprecationsTable } from './kibana_deprecations_table';

const renderWithProviders = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

interface ConfigDeprecationOverrides
  extends Partial<Omit<KibanaDeprecationDetails, 'deprecationType' | 'configPath' | 'filterType'>> {
  configPath: string;
}

const createFeatureDeprecation = (
  overrides: Partial<
    Omit<KibanaDeprecationDetails, 'deprecationType' | 'configPath' | 'filterType'>
  > = {}
): KibanaDeprecationDetails => ({
  id: 'test-id',
  domainId: 'test_domain',
  level: 'warning',
  title: 'Test deprecation',
  message: 'Test message',
  correctiveActions: { manualSteps: ['Step 1'] },
  ...overrides,
  deprecationType: 'feature',
  filterType: 'feature',
});

const createConfigDeprecation = ({
  configPath,
  ...overrides
}: ConfigDeprecationOverrides): KibanaDeprecationDetails => ({
  id: 'test-id',
  domainId: 'test_domain',
  level: 'warning',
  title: 'Test deprecation',
  message: 'Test message',
  correctiveActions: { manualSteps: ['Step 1'] },
  ...overrides,
  deprecationType: 'config',
  filterType: 'config',
  configPath,
});

const mockDeprecations: KibanaDeprecationDetails[] = [
  createConfigDeprecation({
    id: 'dep-1',
    domainId: 'test_domain_1',
    level: 'critical',
    title: 'Critical config deprecation',
    configPath: 'test',
    correctiveActions: {
      manualSteps: ['Step 1'],
      api: { method: 'POST' as const, path: '/test' },
    },
  }),
  createFeatureDeprecation({
    id: 'dep-2',
    domainId: 'test_domain_2',
    level: 'warning',
    title: 'Warning feature deprecation',
  }),
];

const mockReload = jest.fn();
const mockToggleFlyout = jest.fn();

describe('KibanaDeprecationsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('SHOULD render all deprecations as rows', () => {
    renderWithProviders(
      <KibanaDeprecationsTable
        deprecations={mockDeprecations}
        reload={mockReload}
        toggleFlyout={mockToggleFlyout}
        deprecationResolutionStates={{}}
      />
    );

    expect(screen.getByTestId('kibanaDeprecationsTable')).toBeInTheDocument();
    expect(screen.getAllByTestId('row')).toHaveLength(mockDeprecations.length);
  });

  it('SHOULD call reload when refresh button is clicked', () => {
    renderWithProviders(
      <KibanaDeprecationsTable
        deprecations={mockDeprecations}
        reload={mockReload}
        toggleFlyout={mockToggleFlyout}
        deprecationResolutionStates={{}}
      />
    );

    fireEvent.click(screen.getByTestId('refreshButton'));
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('SHOULD call toggleFlyout when deprecation link is clicked', () => {
    renderWithProviders(
      <KibanaDeprecationsTable
        deprecations={mockDeprecations}
        reload={mockReload}
        toggleFlyout={mockToggleFlyout}
        deprecationResolutionStates={{}}
      />
    );

    fireEvent.click(screen.getAllByTestId('deprecationDetailsLink')[0]);
    expect(mockToggleFlyout).toHaveBeenCalledWith(mockDeprecations[0]);
  });

  describe('Search bar', () => {
    it('SHOULD filter by "critical" status', async () => {
      renderWithProviders(
        <KibanaDeprecationsTable
          deprecations={mockDeprecations}
          reload={mockReload}
          toggleFlyout={mockToggleFlyout}
          deprecationResolutionStates={{}}
        />
      );

      fireEvent.click(screen.getByLabelText('Status Selection'));
      await waitFor(() => {
        const option = document.body.querySelector<HTMLElement>(
          '.euiSelectableListItem[title="Critical"]'
        );
        expect(option).not.toBeNull();
        option!.click();
      });

      await waitFor(() => {
        expect(
          within(screen.getByTestId('kibanaDeprecationsTable')).getAllByTestId('row')
        ).toHaveLength(1);
      });

      // Clear (restore all rows)
      const clearButton = document.body.querySelector<HTMLElement>(
        '[data-test-subj="clearSearchButton"]'
      );
      expect(clearButton).not.toBeNull();
      fireEvent.click(clearButton!);

      await waitFor(() => {
        expect(
          within(screen.getByTestId('kibanaDeprecationsTable')).getAllByTestId('row')
        ).toHaveLength(mockDeprecations.length);
      });
    });

    it('SHOULD filter by type', async () => {
      renderWithProviders(
        <KibanaDeprecationsTable
          deprecations={mockDeprecations}
          reload={mockReload}
          toggleFlyout={mockToggleFlyout}
          deprecationResolutionStates={{}}
        />
      );

      fireEvent.click(screen.getByLabelText('Type Selection'));
      await waitFor(() => {
        const option = document.body.querySelector<HTMLElement>(
          '.euiSelectableListItem[title="Config"]'
        );
        expect(option).not.toBeNull();
        option!.click();
      });

      await waitFor(() => {
        expect(
          within(screen.getByTestId('kibanaDeprecationsTable')).getAllByTestId('row')
        ).toHaveLength(1);
      });
    });
  });

  it('SHOULD render empty table when no deprecations', () => {
    renderWithProviders(
      <KibanaDeprecationsTable
        deprecations={[]}
        reload={mockReload}
        toggleFlyout={mockToggleFlyout}
        deprecationResolutionStates={{}}
      />
    );

    expect(screen.getByTestId('kibanaDeprecationsTable')).toBeInTheDocument();
    expect(screen.queryAllByTestId('row')).toHaveLength(0);
  });
});
