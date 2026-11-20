/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { WaitingStepActionPanel } from './waiting_step_action_panel';

jest.mock('./resume_execution_button', () => ({
  ResumeExecutionButton: ({
    appearance,
    waitingStepExecutionId,
  }: {
    appearance?: string;
    waitingStepExecutionId?: string;
  }) => (
    <button
      type="button"
      data-test-subj="provideActionButton"
      data-appearance={appearance}
      data-waiting-step={waitingStepExecutionId ?? ''}
    >
      {'Provide action'}
    </button>
  ),
}));

const renderPanel = (message?: string) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <WaitingStepActionPanel
          ariaLabel="Action required for request_approval"
          action={{
            stepExecutionId: 'step-wait',
            executionId: 'exec-1',
            message,
          }}
        />
      </I18nProvider>
    </EuiProvider>
  );

describe('WaitingStepActionPanel', () => {
  it('renders the description, region label, and Provide action CTA', () => {
    renderPanel('Approve isolation');
    const region = screen.getByTestId('workflowWaitingStepActionPanel');
    expect(region).toHaveAttribute('aria-label', 'Action required for request_approval');
    expect(screen.getByTestId('workflowWaitingStepActionMessage')).toHaveTextContent(
      'Approve isolation'
    );
    const cta = screen.getByTestId('provideActionButton');
    expect(cta).toHaveTextContent('Provide action');
    expect(cta).toHaveAttribute('data-appearance', 'button');
  });

  it('falls back to user-action copy when no resume message is provided', () => {
    renderPanel();
    expect(screen.getByTestId('workflowWaitingStepActionMessage')).toHaveTextContent(
      'User action is required'
    );
  });
});
