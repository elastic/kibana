/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { useInvestigation } from '../hooks/use_investigation';
import { InvestigationLiveState } from './investigation_live_state';

jest.mock('../hooks/use_investigation');
const mockUseInvestigation = useInvestigation as jest.Mock;

const renderLiveState = (severity?: string) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <InvestigationLiveState conversationId="conv-1" severity={severity} />
      </I18nProvider>
    </EuiProvider>
  );

describe('InvestigationLiveState', () => {
  it('shows the severity the agent set mid-run and the running indicator', () => {
    mockUseInvestigation.mockReturnValue({
      data: { in_progress: true, metadata: { status: 'open', severity: 'critical' } },
    });

    renderLiveState('low');

    expect(screen.getByTestId('investigationFlyoutSeverity')).toHaveTextContent('Critical');
    expect(screen.getByTestId('investigationRunningState')).toHaveTextContent('Investigating…');
  });

  it("falls back to the conversation's severity before the investigation is read", () => {
    mockUseInvestigation.mockReturnValue({ data: undefined });

    renderLiveState('high');

    expect(screen.getByTestId('investigationFlyoutSeverity')).toHaveTextContent('High');
    expect(screen.queryByTestId('investigationRunningState')).not.toBeInTheDocument();
  });

  it('shows nothing for an unrated investigation nothing works on', () => {
    mockUseInvestigation.mockReturnValue({
      data: { in_progress: false, metadata: { status: 'open' } },
    });

    renderLiveState();

    expect(screen.queryByTestId('investigationFlyoutSeverity')).not.toBeInTheDocument();
    expect(screen.queryByTestId('investigationRunningState')).not.toBeInTheDocument();
  });
});
