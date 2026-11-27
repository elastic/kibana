/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { WorkflowExecutionSettings } from './workflow_execution_settings';

const renderSettings = (
  props: Partial<React.ComponentProps<typeof WorkflowExecutionSettings>> = {}
) => {
  const onCommit = jest.fn();
  render(
    <I18nProvider>
      <WorkflowExecutionSettings settings={undefined} onCommit={onCommit} {...props} />
    </I18nProvider>
  );
  return { onCommit };
};

const type = (testId: string, value: string) => {
  const input = screen.getByTestId(testId);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};

describe('WorkflowExecutionSettings', () => {
  it('shows the settings the workflow has', () => {
    renderSettings({
      settings: {
        timeout: '20m',
        'max-step-size': '10mb',
        concurrency: { key: '{{ id }}', strategy: 'drop', max: 2 },
      },
    });

    expect(screen.getByTestId('workflowSettingsTimeoutInput')).toHaveValue('20m');
    expect(screen.getByTestId('workflowSettingsMaxStepSizeInput')).toHaveValue('10mb');
    expect(screen.getByTestId('workflowSettingsConcurrencyKeyInput')).toHaveValue('{{ id }}');
    expect(screen.getByTestId('workflowSettingsConcurrencyStrategySelect')).toHaveValue('drop');
    expect(screen.getByTestId('workflowSettingsConcurrencyMaxInput')).toHaveValue(2);
  });

  it('writes a valid value as the field is left', () => {
    const { onCommit } = renderSettings();

    type('workflowSettingsTimeoutInput', '45s');

    expect(onCommit).toHaveBeenLastCalledWith(expect.objectContaining({ timeout: '45s' }));
  });

  it('says what is wrong with a value and does not write it', () => {
    const { onCommit } = renderSettings();

    type('workflowSettingsTimeoutInput', 'soon');

    expect(screen.getByText('Enter a duration such as 30s, 5m or 1h.')).toBeInTheDocument();
    expect(onCommit).toHaveBeenLastCalledWith(expect.not.objectContaining({ timeout: 'soon' }));
    expect(onCommit.mock.calls[0][0]).not.toHaveProperty('timeout');
  });

  it('writes the strategy as soon as it is chosen', () => {
    const { onCommit } = renderSettings();

    fireEvent.change(screen.getByTestId('workflowSettingsConcurrencyStrategySelect'), {
      target: { value: 'cancel-in-progress' },
    });

    expect(onCommit).toHaveBeenCalledWith({
      timeout: null,
      'max-step-size': null,
      concurrency: { strategy: 'cancel-in-progress' },
    });
  });

  it('offers the queue settings only for the queue strategy', () => {
    renderSettings();
    expect(screen.queryByTestId('workflowSettingsQueueSizeInput')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('workflowSettingsConcurrencyStrategySelect'), {
      target: { value: 'queue' },
    });

    expect(screen.getByTestId('workflowSettingsQueueSizeInput')).toBeInTheDocument();
    expect(screen.getByTestId('workflowSettingsQueueTtlInput')).toBeInTheDocument();
  });

  it('disables every field and writes nothing when read-only', () => {
    const { onCommit } = renderSettings({ readOnly: true, settings: { timeout: '5m' } });

    expect(screen.getByTestId('workflowSettingsTimeoutInput')).toBeDisabled();
    expect(screen.getByTestId('workflowSettingsConcurrencyStrategySelect')).toBeDisabled();
    fireEvent.blur(screen.getByTestId('workflowSettingsTimeoutInput'));
    expect(onCommit).not.toHaveBeenCalled();
  });
});
