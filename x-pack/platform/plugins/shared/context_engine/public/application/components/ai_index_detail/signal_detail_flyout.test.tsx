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
import type { Signal } from '../../../../common/http_api/signals';
import { SignalDetailFlyout } from './signal_detail_flyout';
import { buildSignal } from './signal_test_fixtures';

jest.mock('@kbn/llm-trace-waterfall', () => ({
  TraceWaterfall: () => <div data-test-subj="mockTraceWaterfall" />,
  createEsTraceFetcher: () => async () => ({ spans: [], durationMs: 0 }),
  useTraceSpans: () => ({ spans: [], durationMs: 0, isLoading: false, error: null }),
}));

const services = {
  ...coreMock.createStart(),
  data: { search: { search: jest.fn() } },
  spaces: undefined,
};

const renderFlyout = (signals: Signal[], index = 0, total = signals.length) => {
  const onNavigate = jest.fn();
  const onClose = jest.fn();
  const view = render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <SignalDetailFlyout
            signals={signals}
            total={total}
            index={index}
            onNavigate={onNavigate}
            onClose={onClose}
          />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
  return { onNavigate, onClose, view };
};

describe('SignalDetailFlyout', () => {
  const signals = [
    buildSignal({ target_index: 'index-a' }),
    buildSignal({ target_index: 'index-b' }),
    buildSignal({ target_index: 'index-c' }),
  ];

  it('renders the fields, query and error blocks for the current signal', () => {
    renderFlyout(signals, 1);

    expect(screen.getByTestId('contextSignalDetailFields')).toBeInTheDocument();
    expect(screen.getByTestId('contextSignalDetailQuery')).toBeInTheDocument();
    expect(screen.getByTestId('contextSignalDetailError')).toHaveTextContent('boom');
    expect(screen.getByTestId('contextSignalDetailPosition')).toHaveTextContent('Signal 2 of 3');
  });

  it('bases the "Signal X of N" label on the group total, not the loaded page', () => {
    renderFlyout(signals, 0, 100);

    expect(screen.getByTestId('contextSignalDetailPosition')).toHaveTextContent('Signal 1 of 100');
  });

  it('shows the no-trace message when the space id is unavailable', () => {
    renderFlyout(signals, 0);

    expect(screen.getByTestId('contextSignalDetailNoTrace')).toBeInTheDocument();
  });

  it('shows a loading placeholder (not "no trace") while the active space is still resolving', () => {
    // A spaces plugin whose active space never resolves keeps `useSpaceId` in the resolving state.
    const resolvingServices = {
      ...services,
      spaces: { getActiveSpace: () => new Promise(() => {}) },
    };
    render(
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider services={resolvingServices}>
            <SignalDetailFlyout
              signals={signals}
              total={signals.length}
              index={0}
              onNavigate={jest.fn()}
              onClose={jest.fn()}
            />
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    );

    expect(screen.getByTestId('contextSignalDetailTraceLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextSignalDetailNoTrace')).not.toBeInTheDocument();
  });

  it('disables Previous on the first signal and navigates with Next', () => {
    const { onNavigate } = renderFlyout(signals, 0);

    expect(screen.getByTestId('contextSignalDetailPreviousButton')).toBeDisabled();
    expect(screen.getByTestId('contextSignalDetailNextButton')).not.toBeDisabled();

    fireEvent.click(screen.getByTestId('contextSignalDetailNextButton'));
    expect(onNavigate).toHaveBeenCalledWith(1);
  });

  it('disables Next on the last signal and navigates with Previous', () => {
    const { onNavigate } = renderFlyout(signals, 2);

    expect(screen.getByTestId('contextSignalDetailNextButton')).toBeDisabled();
    expect(screen.getByTestId('contextSignalDetailPreviousButton')).not.toBeDisabled();

    fireEvent.click(screen.getByTestId('contextSignalDetailPreviousButton'));
    expect(onNavigate).toHaveBeenCalledWith(1);
  });
});
