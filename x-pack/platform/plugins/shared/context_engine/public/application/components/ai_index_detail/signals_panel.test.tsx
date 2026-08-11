/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import type { ChatOpener } from '../../../types';
import { useSignalGroups } from '../../hooks/use_signal_groups';
import { useSignals } from '../../hooks/use_signals';
import { SignalsPanel } from './signals_panel';
import { buildSignal } from './signal_test_fixtures';

jest.mock('../../hooks/use_signal_groups', () => ({ useSignalGroups: jest.fn() }));
jest.mock('../../hooks/use_signals', () => ({ useSignals: jest.fn() }));
jest.mock('@kbn/llm-trace-waterfall', () => ({
  TraceWaterfall: () => <div />,
  createEsTraceFetcher: () => async () => ({ spans: [], durationMs: 0 }),
  useTraceSpans: () => ({ spans: [], durationMs: 0, isLoading: false, error: null }),
}));

const mockUseSignalGroups = jest.mocked(useSignalGroups);
const mockUseSignals = jest.mocked(useSignals);

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const groupsResult = (overrides = {}) => ({
  groups: [],
  isLoading: false,
  error: undefined,
  refetch: jest.fn(),
  ...overrides,
});

const signalsResult = (overrides = {}) => ({
  signals: [],
  total: 0,
  isLoading: false,
  error: undefined,
  refetch: jest.fn(),
  ...overrides,
});

const renderPanel = ({
  isLoading = false,
  chatOpener,
}: { isLoading?: boolean; chatOpener?: ChatOpener } = {}) => {
  const services = {
    ...coreMock.createStart(),
    data: { search: { search: jest.fn() } },
    getChatOpener: () => chatOpener,
  };
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <SignalsPanel isLoading={isLoading} aiIndex={aiIndex} />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

describe('SignalsPanel', () => {
  beforeEach(() => {
    mockUseSignalGroups.mockReturnValue(groupsResult());
    mockUseSignals.mockReturnValue(signalsResult());
  });

  afterEach(() => jest.clearAllMocks());

  it('shows the loading skeleton while the AI index loads', () => {
    renderPanel({ isLoading: true });
    expect(screen.getByTestId('contextSignalsLoading')).toBeInTheDocument();
  });

  it('shows the loading skeleton while the groups load', () => {
    mockUseSignalGroups.mockReturnValue(groupsResult({ isLoading: true }));
    renderPanel();
    expect(screen.getByTestId('contextSignalsLoading')).toBeInTheDocument();
  });

  it('shows the empty prompt when there are no groups', () => {
    renderPanel();
    expect(screen.getByTestId('contextSignalsEmpty')).toBeInTheDocument();
  });

  it('renders the preaggregated grouped-by-tag list', () => {
    mockUseSignalGroups.mockReturnValue(
      groupsResult({
        groups: [
          { tag: 'query_error', count: 7 },
          { tag: 'empty_retrieval', count: 3 },
        ],
      })
    );
    renderPanel();

    const rows = screen.getAllByTestId('contextSignalGroupRow');
    expect(rows).toHaveLength(2);
    expect(screen.getByText('Query error')).toBeInTheDocument();
    expect(screen.getByText('Empty retrieval')).toBeInTheDocument();
    expect(screen.getAllByTestId('contextSignalGroupCount')[0]).toHaveTextContent('7 signals');
  });

  it('drills into a group to show its signals', () => {
    mockUseSignalGroups.mockReturnValue(
      groupsResult({ groups: [{ tag: 'query_error', count: 1 }] })
    );
    mockUseSignals.mockReturnValue(signalsResult({ signals: [buildSignal()], total: 1 }));
    renderPanel();

    fireEvent.click(screen.getByTestId('contextSignalGroupRow'));

    expect(screen.getByTestId('contextSignalsGroupDetail')).toBeInTheDocument();
    expect(screen.getByTestId('contextSignalRow')).toBeInTheDocument();
  });

  it('hides the Analyze & improve button when no opener is registered', () => {
    renderPanel();
    expect(screen.queryByTestId('contextSignalsAnalyzeButton')).not.toBeInTheDocument();
  });

  it('shows the Analyze & improve button and invokes the registered opener without signals', () => {
    const opener = jest.fn();
    renderPanel({ chatOpener: opener });

    fireEvent.click(screen.getByTestId('contextSignalsAnalyzeButton'));

    expect(opener).toHaveBeenCalledWith({ aiIndex, tag: undefined });
    expect(opener.mock.calls[0][0]).not.toHaveProperty('signals');
  });

  it('renders a distinct error state when the groups query fails', () => {
    mockUseSignalGroups.mockReturnValue(groupsResult({ error: new Error('boom') }));
    renderPanel();

    expect(screen.getByTestId('contextSignalsError')).toBeInTheDocument();
    expect(screen.queryByTestId('contextSignalsEmpty')).not.toBeInTheDocument();
  });

  it('renders the error state when the per-group signals query fails', () => {
    mockUseSignalGroups.mockReturnValue(
      groupsResult({ groups: [{ tag: 'query_error', count: 1 }] })
    );
    mockUseSignals.mockReturnValue(signalsResult({ error: new Error('boom') }));
    renderPanel();

    fireEvent.click(screen.getByTestId('contextSignalGroupRow'));

    expect(screen.getByTestId('contextSignalsError')).toBeInTheDocument();
  });

  it('shows a truncation notice when the group total exceeds the loaded page', () => {
    mockUseSignalGroups.mockReturnValue(
      groupsResult({ groups: [{ tag: 'query_error', count: 100 }] })
    );
    mockUseSignals.mockReturnValue(signalsResult({ signals: [buildSignal()], total: 100 }));
    renderPanel();

    fireEvent.click(screen.getByTestId('contextSignalGroupRow'));

    expect(screen.getByTestId('contextSignalsGroupTruncated')).toHaveTextContent(
      'Showing first 1 of 100'
    );
  });
});
