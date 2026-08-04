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
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { KnowledgeIndicatorsPanel } from './knowledge_indicators_panel';

const mockUseAiIndexKiSummary = jest.fn();

jest.mock('../../hooks/use_ai_index_ki_summary', () => ({
  useAiIndexKiSummary: (...args: unknown[]) => mockUseAiIndexKiSummary(...args),
}));

const aiIndex: GetAiIndexResponse = {
  id: 'sample-ki',
  managed: false,
  dest: { type: 'index', value: 'ai-index-idx-sample-ki' },
  automations: [],
  sources: [{ type: 'esql', value: 'FROM ai-index-idx-sample-ki | LIMIT 10' }],
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
  services.share.url.locators.get = jest.fn().mockReturnValue({
    getRedirectUrl: jest.fn(
      () => '/app/discover#/?_a=(query:(esql:FROM%20ai-index-idx-sample-ki))'
    ),
  });

  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>{ui}</KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

describe('KnowledgeIndicatorsPanel', () => {
  beforeEach(() => {
    mockUseAiIndexKiSummary.mockReturnValue({
      kiSummary: {
        count: 25,
        dest: aiIndex.dest,
        counts_by_type: [
          { type: 'index_metadata', count: 10 },
          { type: 'document', count: 8 },
          { type: 'detection', count: 7 },
        ],
      },
      isLoading: false,
      error: undefined,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state while the summary is loading', () => {
    mockUseAiIndexKiSummary.mockReturnValue({
      kiSummary: undefined,
      isLoading: true,
      error: undefined,
      refetch: jest.fn(),
    });

    renderWithProviders(<KnowledgeIndicatorsPanel isLoading aiIndex={undefined} />);

    expect(screen.getByTestId('contextAiIndexKiLoading')).toBeInTheDocument();
  });

  it('renders header summary, per-type stats, and Discover link', () => {
    renderWithProviders(<KnowledgeIndicatorsPanel isLoading={false} aiIndex={aiIndex} />);

    expect(screen.getByTestId('contextAiIndexKiHeaderSummary')).toHaveTextContent(
      '25 in ai-index-idx-sample-ki'
    );
    expect(screen.getByTestId('contextAiIndexKiTypeCount-index_metadata')).toHaveTextContent('10');
    expect(screen.getByTestId('contextAiIndexKiTypeCount-index_metadata')).toHaveTextContent(
      'Index metadata'
    );
    expect(screen.getByTestId('contextAiIndexKiTypeCount-document')).toHaveTextContent('8');
    expect(screen.getByTestId('contextAiIndexKiTypeCount-document')).toHaveTextContent('Documents');
    expect(screen.getByTestId('contextAiIndexKiTypeCount-detection')).toHaveTextContent('7');
    expect(screen.getByTestId('contextAiIndexKiTypeCount-detection')).toHaveTextContent(
      'Detections'
    );
    expect(screen.getByTestId('contextAiIndexKiDiscoverLink')).toHaveAttribute(
      'href',
      '/app/discover#/?_a=(query:(esql:FROM%20ai-index-idx-sample-ki))'
    );
  });

  it('hides type stats with zero counts', () => {
    mockUseAiIndexKiSummary.mockReturnValue({
      kiSummary: {
        count: 10,
        dest: aiIndex.dest,
        counts_by_type: [{ type: 'index_metadata', count: 10 }],
      },
      isLoading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    renderWithProviders(<KnowledgeIndicatorsPanel isLoading={false} aiIndex={aiIndex} />);

    expect(screen.getByTestId('contextAiIndexKiTypeCount-index_metadata')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexKiTypeCount-document')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexKiTypeCount-detection')).not.toBeInTheDocument();
  });

  it('groups overflow type stats into Other types when more than five types exist', () => {
    mockUseAiIndexKiSummary.mockReturnValue({
      kiSummary: {
        count: 21,
        dest: aiIndex.dest,
        counts_by_type: [
          { type: 'index_metadata', count: 1 },
          { type: 'document', count: 2 },
          { type: 'detection', count: 3 },
          { type: 'faq', count: 6 },
          { type: 'others', count: 9 },
        ],
      },
      isLoading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    renderWithProviders(<KnowledgeIndicatorsPanel isLoading={false} aiIndex={aiIndex} />);

    expect(screen.getByTestId('contextAiIndexKiTypeCount-index_metadata')).toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexKiTypeCount-document')).toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexKiTypeCount-detection')).toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexKiTypeCount-faq')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexKiTypeCount-playbook')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexKiTypeCount-policy')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexKiTypeCount-others')).toHaveTextContent('9');
    expect(screen.getByTestId('contextAiIndexKiTypeCount-others')).toHaveTextContent('Other types');
  });

  it('shows an error message when the summary request fails', () => {
    mockUseAiIndexKiSummary.mockReturnValue({
      kiSummary: undefined,
      isLoading: false,
      error: new Error('boom'),
      refetch: jest.fn(),
    });

    renderWithProviders(<KnowledgeIndicatorsPanel isLoading={false} aiIndex={aiIndex} />);

    expect(screen.getByTestId('contextAiIndexKiError')).toBeInTheDocument();
  });
});
