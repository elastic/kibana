/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { AutomationStartedBy } from './automation_started_by';

const renderBlock = (props: React.ComponentProps<typeof AutomationStartedBy>) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <AutomationStartedBy {...props} />
      </I18nProvider>
    </EuiProvider>
  );

describe('AutomationStartedBy', () => {
  it('shows the name and short instructions in full, with no toggle', () => {
    renderBlock({ name: 'Payments alerts', instructions: 'Check the payment service first.' });

    expect(screen.getByTestId('investigationOverviewAutomationName')).toHaveTextContent(
      'Payments alerts'
    );
    expect(screen.getByTestId('investigationOverviewAutomationInstructions')).toHaveTextContent(
      'Check the payment service first.'
    );
    expect(screen.queryByTestId('investigationOverviewAutomationToggle')).not.toBeInTheDocument();
  });

  it('shows only the name without instructions', () => {
    renderBlock({ name: 'Payments alerts' });

    expect(screen.getByText('Payments alerts')).toBeInTheDocument();
    expect(
      screen.queryByTestId('investigationOverviewAutomationInstructions')
    ).not.toBeInTheDocument();
  });

  it('renders instructions as text, never as markup', () => {
    renderBlock({ name: 'A', instructions: '<img src=x onerror=alert(1)> **bold**' });

    const instructions = screen.getByTestId('investigationOverviewAutomationInstructions');
    expect(instructions).toHaveTextContent('<img src=x onerror=alert(1)> **bold**');
    expect(instructions.querySelector('img')).toBeNull();
  });

  it('clamps long instructions until the toggle expands them', () => {
    const instructions = 'Look at the payment service. '.repeat(170);
    renderBlock({ name: 'A', instructions });

    const text = screen.getByTestId('investigationOverviewAutomationInstructions');
    const toggle = screen.getByTestId('investigationOverviewAutomationToggle');
    expect(toggle).toHaveTextContent('Show more');
    expect(getComputedStyle(text).overflow).toBe('hidden');

    fireEvent.click(toggle);

    expect(toggle).toHaveTextContent('Show less');
    expect(getComputedStyle(text).overflow).not.toBe('hidden');
    expect(text).toHaveTextContent(instructions.trim());
  });
});
