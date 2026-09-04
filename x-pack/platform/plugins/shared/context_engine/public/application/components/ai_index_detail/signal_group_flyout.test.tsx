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
import { useSignals } from '../../hooks/use_signals';
import { SignalGroupFlyout } from './signal_group_flyout';
import { buildSignal } from './signal_test_fixtures';

jest.mock('../../hooks/use_signals', () => ({ useSignals: jest.fn() }));
jest.mock('@kbn/llm-trace-waterfall', () => ({
  TraceWaterfall: () => <div data-test-subj="mockTraceWaterfall" />,
  createEsTraceFetcher: () => async () => ({ spans: [], durationMs: 0 }),
  useTraceSpans: () => ({ spans: [], durationMs: 0, isLoading: false, error: null }),
}));

const mockUseSignals = jest.mocked(useSignals);

const aiIndex = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
} as GetAiIndexResponse;

const signalsResult = (overrides = {}) => ({
  signals: [],
  total: 0,
  isLoading: false,
  error: undefined,
  refetch: jest.fn(),
  ...overrides,
});

const renderFlyout = ({ chatOpener }: { chatOpener?: ChatOpener } = {}) => {
  const onClose = jest.fn();
  const services = {
    ...coreMock.createStart(),
    data: { search: { search: jest.fn() } },
    spaces: undefined,
    getChatOpener: () => chatOpener,
  };
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <SignalGroupFlyout
            group={{ tag: 'query_error', count: 100 }}
            aiIndex={aiIndex}
            onClose={onClose}
          />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
  return { onClose };
};

describe('SignalGroupFlyout', () => {
  beforeEach(() => mockUseSignals.mockReturnValue(signalsResult()));
  afterEach(() => jest.clearAllMocks());

  it('renders the loading skeleton while signals load', () => {
    mockUseSignals.mockReturnValue(signalsResult({ isLoading: true }));
    renderFlyout();
    expect(screen.getByTestId('contextSignalsGroupLoading')).toBeInTheDocument();
  });

  it('renders the empty state when the group has no signals', () => {
    renderFlyout();
    expect(screen.getByTestId('contextSignalsGroupEmpty')).toBeInTheDocument();
  });

  it('renders the error state when the signals query fails', () => {
    mockUseSignals.mockReturnValue(signalsResult({ error: new Error('boom') }));
    renderFlyout();
    expect(screen.getByTestId('contextSignalsError')).toBeInTheDocument();
  });

  it('renders member signal rows and the group count', () => {
    mockUseSignals.mockReturnValue(signalsResult({ signals: [buildSignal()], total: 1 }));
    renderFlyout();
    expect(screen.getByTestId('contextSignalRow')).toBeInTheDocument();
    expect(screen.getByTestId('contextSignalGroupFlyoutCount')).toHaveTextContent('100 signals');
  });

  it('shows a Load more control and truncation notice when more signals exist than are loaded', () => {
    mockUseSignals.mockReturnValue(signalsResult({ signals: [buildSignal()], total: 100 }));
    renderFlyout();
    expect(screen.getByTestId('contextSignalsGroupTruncated')).toHaveTextContent(
      'Showing 1 of 100'
    );
    expect(screen.getByTestId('contextSignalsGroupLoadMore')).toBeInTheDocument();
  });

  it('invokes the chat opener with the group tag when Analyze & improve is clicked', () => {
    const opener = jest.fn();
    mockUseSignals.mockReturnValue(signalsResult({ signals: [buildSignal()], total: 1 }));
    renderFlyout({ chatOpener: opener });

    fireEvent.click(screen.getByTestId('contextSignalGroupAnalyzeButton'));
    expect(opener).toHaveBeenCalledWith({ aiIndex, tag: 'query_error' });
  });

  it('stacks the signal detail flyout when a row is opened', () => {
    mockUseSignals.mockReturnValue(signalsResult({ signals: [buildSignal()], total: 1 }));
    renderFlyout();

    fireEvent.click(screen.getByTestId('contextSignalRowViewDetailsButton'));
    expect(screen.getByTestId('contextSignalDetailFlyout')).toBeInTheDocument();
  });
});
