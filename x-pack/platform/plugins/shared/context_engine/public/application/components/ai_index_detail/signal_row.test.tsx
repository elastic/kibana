/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { Signal } from '../../../../common/http_api/signals';
import { SignalRow } from './signal_row';
import { buildSignal } from './signal_test_fixtures';

const renderRow = (signal: Signal, onViewDetails = jest.fn()) => {
  render(
    <I18nProvider>
      <EuiProvider>
        <SignalRow signal={signal} onViewDetails={onViewDetails} />
      </EuiProvider>
    </I18nProvider>
  );
  return { onViewDetails };
};

describe('SignalRow', () => {
  it('renders the humanized title, summary, status and evidence chips', () => {
    renderRow(buildSignal());

    expect(screen.getByTestId('contextSignalRowTitle')).toHaveTextContent(
      'Query error · ai-index-ds-support'
    );
    expect(screen.getByTestId('contextSignalRowStatus')).toHaveTextContent('Error');
    expect(screen.getByTestId('contextSignalRowSummary')).not.toBeEmptyDOMElement();
    expect(screen.getByTestId('contextSignalRowQueryKind')).toHaveTextContent(
      'Knowledge Indicator retrieval'
    );
    expect(screen.getByTestId('contextSignalRowFellBackToRaw')).toBeInTheDocument();
    expect(screen.getByTestId('contextSignalRowLooped')).toBeInTheDocument();
    expect(screen.getByTestId('contextSignalRowRounds')).toHaveTextContent(
      '2 ES|QL · 1 raw · 1 KI'
    );
  });

  it('shows a success badge and hides the fell-back chip for a clean signal', () => {
    renderRow(
      buildSignal({ status: 'Ok', fell_back_to_raw: false, looped: false, error: undefined }, [])
    );

    expect(screen.getByTestId('contextSignalRowStatus')).toHaveTextContent('Ok');
    expect(screen.queryByTestId('contextSignalRowFellBackToRaw')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextSignalRowLooped')).not.toBeInTheDocument();
  });

  it('invokes onViewDetails when the button is clicked', () => {
    const { onViewDetails } = renderRow(buildSignal());

    fireEvent.click(screen.getByTestId('contextSignalRowViewDetailsButton'));

    expect(onViewDetails).toHaveBeenCalledTimes(1);
  });
});
