/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type {
  InvestigationNextStep,
  SignificantEventMitigationRun,
} from '@kbn/significant-events-schema';
import { NextSteps } from './next_steps';

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

const steps: InvestigationNextStep[] = [
  { description: 'Page the checkout-service owner.' },
  {
    description: 'Rollout-restart the checkout-service deployment.',
    mitigation: {
      workflow_id: 'wf-restart',
      workflow_name: 'Rollout-restart a deployment',
      inputs: { namespace: 'prod', deployment: 'checkout-service' },
      rationale: 'Restarting clears the leaked connection pool.',
      confidence: 'high',
      risk: 'medium',
    },
  },
];

describe('NextSteps', () => {
  it('renders plain steps as a list and mitigation proposals as cards', () => {
    renderWithI18n(<NextSteps steps={steps} />);

    expect(screen.getByTestId('investigationNextStepsPlain')).toHaveTextContent(
      'Page the checkout-service owner.'
    );
    const card = screen.getByTestId('investigationNextStepMitigationCard');
    expect(card).toHaveTextContent('Rollout-restart a deployment');
    expect(card).toHaveTextContent('Confidence: high');
    expect(card).toHaveTextContent('Risk: medium');
    expect(screen.getByTestId('investigationNextStepInputs')).toHaveTextContent('checkout-service');
  });

  it('shows an auto-run badge with an execution link for a matching auto_run record', () => {
    const runs: SignificantEventMitigationRun[] = [
      {
        workflow_id: 'wf-restart',
        execution_id: 'exec-1',
        decision: 'auto_run',
        reason: 'Cleared all thresholds.',
      },
    ];

    renderWithI18n(
      <NextSteps
        steps={steps}
        mitigationRuns={runs}
        getExecutionHref={(workflowId, executionId) => `/wf/${workflowId}/${executionId}`}
      />
    );

    expect(screen.getByTestId('investigationNextStepRunBadge')).toHaveTextContent('Auto-run');
    expect(screen.getByTestId('investigationNextStepExecutionLink')).toHaveAttribute(
      'href',
      '/wf/wf-restart/exec-1'
    );
    expect(screen.queryByTestId('investigationNextStepRunButton')).not.toBeInTheDocument();
  });

  it('shows the rejection reason for a rejected decision', () => {
    const runs: SignificantEventMitigationRun[] = [
      { workflow_id: 'wf-restart', decision: 'rejected', reason: 'Risk exceeds the policy.' },
    ];

    renderWithI18n(<NextSteps steps={steps} mitigationRuns={runs} />);

    expect(screen.getByTestId('investigationNextStepRejected')).toHaveTextContent(
      'Not auto-run: Risk exceeds the policy.'
    );
  });

  it('fires onRunMitigation with the proposal when the run button is clicked', async () => {
    const onRunMitigation = jest.fn().mockResolvedValue(undefined);

    renderWithI18n(<NextSteps steps={steps} onRunMitigation={onRunMitigation} />);

    fireEvent.click(screen.getByTestId('investigationNextStepRunButton'));

    await waitFor(() =>
      expect(onRunMitigation).toHaveBeenCalledWith(
        expect.objectContaining({ workflow_id: 'wf-restart' })
      )
    );
  });

  it('omits the run button when no handler is provided', () => {
    renderWithI18n(<NextSteps steps={steps} />);

    expect(screen.queryByTestId('investigationNextStepRunButton')).not.toBeInTheDocument();
  });
});
