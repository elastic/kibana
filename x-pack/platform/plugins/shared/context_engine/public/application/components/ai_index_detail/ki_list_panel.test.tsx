/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { KiListPanel } from './ki_list_panel';

const mockUseKiList = jest.fn();

jest.mock('../../hooks/use_ki_list', () => ({
  useKiList: (...args: unknown[]) => mockUseKiList(...args),
}));

jest.mock('../../hooks/use_data_connectors', () => ({
  useDataConnectors: () => ({
    connectorNameById: new Map([['connector-1', 'Google Drive']]),
    connectorActionTypeById: new Map(),
  }),
}));

const aiIndex: GetAiIndexResponse = {
  id: 'sample-ki',
  managed: false,
  dest: { type: 'index', value: 'ai-index-idx-sample-ki' },
  automations: [],
  sources: [{ type: 'connector', value: 'connector-1' }],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const renderWithProviders = (ui: React.ReactElement) => {
  const services = {
    ...coreMock.createStart(),
    share: sharePluginMock.createStartContract(),
  };
  services.application.capabilities = {
    ...services.application.capabilities,
    discover_v2: { show: true },
  };

  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>{ui}</KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

describe('KiListPanel', () => {
  const stableCountsByType = [
    { type: 'playbook', count: 1 },
    { type: 'policy', count: 1 },
    { type: 'faq', count: 4 },
  ];

  beforeEach(() => {
    mockUseKiList.mockImplementation(({ type }: { type?: string }) => ({
      kis: [
        {
          ki_id: 'ki-1',
          type: 'playbook',
          title: 'Refund playbook',
          description: 'Verify the order first.',
          source_label: 'Google Drive',
          version: 'v1',
        },
      ],
      total: type === undefined ? 6 : 1,
      totalAll: 6,
      countsByType: stableCountsByType,
      isLoading: false,
      error: undefined,
      refetch: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the list rows and type filters from counts_by_type', () => {
    renderWithProviders(<KiListPanel aiIndex={aiIndex} />);

    expect(screen.getByTestId('contextKiListPanel')).toBeInTheDocument();
    expect(screen.getByTestId('contextKiListPanelContent')).toBeInTheDocument();
    expect(screen.getByTestId('contextKiListRows')).toBeInTheDocument();
    expect(screen.getByTestId('contextKiRowTitle')).toHaveTextContent('Refund playbook');
    expect(screen.getByTestId('contextKiListFilter-all')).toBeInTheDocument();
    expect(screen.getByTestId('contextKiListFilter-playbook')).toBeInTheDocument();
    expect(screen.getByTestId('contextKiListFilter-policy')).toBeInTheDocument();
    expect(screen.queryByTestId('contextKiListFilter-others')).not.toBeInTheDocument();
  });

  it('requests a type filter when a type button is selected', () => {
    renderWithProviders(<KiListPanel aiIndex={aiIndex} />);

    fireEvent.click(screen.getByTestId('contextKiListFilter-playbook'));

    expect(mockUseKiList).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'playbook',
      })
    );
  });

  it('keeps all type filter buttons visible after selecting a type', () => {
    renderWithProviders(<KiListPanel aiIndex={aiIndex} />);

    fireEvent.click(screen.getByTestId('contextKiListFilter-playbook'));

    expect(screen.getByTestId('contextKiListFilter-all')).toBeInTheDocument();
    expect(screen.getByTestId('contextKiListFilter-playbook')).toBeInTheDocument();
    expect(screen.getByTestId('contextKiListFilter-policy')).toBeInTheDocument();
    expect(screen.getByTestId('contextKiListFilter-faq')).toBeInTheDocument();
  });

  it('keeps the header summary count at the unfiltered total when a type is selected', () => {
    renderWithProviders(<KiListPanel aiIndex={aiIndex} />);

    fireEvent.click(screen.getByTestId('contextKiListFilter-playbook'));

    expect(screen.getByTestId('contextKiListPanelSummary')).toHaveTextContent(
      '6 Knowledge Indicators in ai-index-idx-sample-ki'
    );
  });
});
