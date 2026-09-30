/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '../../../../../test_utils/render_with_ml_context';
import { EsqlSummaryStep } from './esql_summary_step';
import { EsqlWizardProvider, useEsqlWizardContext } from './esql_wizard_context';

jest.mock('./esql_preview_panel', () => ({
  EsqlPreviewPanel: () => <div data-test-subj="mlEsqlPreviewPanelStub" />,
}));

jest.mock('./esql_create_flow', () => ({
  EsqlCreateFlow: () => <div data-test-subj="mlEsqlCreateFlowStub" />,
}));

const Seed = () => {
  const { setJobId, setJobDescription, setJobGroups, setQueryState } = useEsqlWizardContext();

  useEffect(() => {
    setJobId('esql-job-1');
    setJobDescription('a description');
    setJobGroups(['team-a']);
    setQueryState({
      detectors: [{ function: 'rare', byField: 'host', overField: 'region' }],
      influencers: ['host'],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

describe('EsqlSummaryStep', () => {
  it('renders a read-only summary of the collected configuration', () => {
    renderWithI18n(
      <EsqlWizardProvider>
        <Seed />
        <EsqlSummaryStep />
      </EsqlWizardProvider>
    );

    const summary = screen.getByTestId('mlEsqlSummaryList');
    expect(summary).toHaveTextContent('esql-job-1');
    expect(summary).toHaveTextContent('a description');
    expect(summary).toHaveTextContent('team-a');
    expect(summary).toHaveTextContent('rare() by host over region');
    expect(summary).toHaveTextContent('host');
    expect(screen.getByTestId('mlEsqlPreviewPanelStub')).toBeInTheDocument();
    expect(screen.getByTestId('mlEsqlCreateFlowStub')).toBeInTheDocument();
  });

  it('renders the real-time switch on by default and toggles the wizard state', () => {
    let continueInRealTime: boolean | undefined;
    const Probe = () => {
      continueInRealTime = useEsqlWizardContext().state.continueInRealTime;
      return null;
    };
    renderWithI18n(
      <EsqlWizardProvider>
        <Probe />
        <EsqlSummaryStep />
      </EsqlWizardProvider>
    );

    const toggle = screen.getByTestId('mlEsqlContinueInRealTimeSwitch');
    expect(toggle).toBeChecked();
    expect(screen.getByText('Continue in real time after the selected range')).toBeInTheDocument();
    expect(continueInRealTime).toBe(true);

    fireEvent.click(toggle);

    expect(screen.getByTestId('mlEsqlContinueInRealTimeSwitch')).not.toBeChecked();
    expect(continueInRealTime).toBe(false);
  });
});
