/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FormTestProvider } from '../../components/test_utils';
import { OutboundFormSection } from './inbound_events_form_section';

const OutboundFields = () => (
  <>
    <UseField path="secrets.authType">{() => null}</UseField>
    <UseField<string> path="secrets.apiKey" config={{ defaultValue: '' }}>
      {(field) => (
        <input
          data-test-subj="api-key-input"
          value={field.value}
          onChange={(event) => field.setValue(event.target.value)}
        />
      )}
    </UseField>
    <UseField path="config.selectedActions">{() => null}</UseField>
    <div data-test-subj="outbound-fields">Datadog keys</div>
  </>
);

const renderSection = ({
  runActions,
  selectedActions = null,
  canSave = true,
}: {
  runActions?: boolean;
  selectedActions?: string[] | null;
  canSave?: boolean;
} = {}) => {
  const onSubmit = jest.fn();
  render(
    <FormTestProvider
      onSubmit={onSubmit}
      defaultValue={{
        secrets: { authType: 'basic' },
        config: { selectedActions },
        ...(runActions === undefined ? {} : { __internal__: { runActions } }),
      }}
    >
      <OutboundFormSection canSave={canSave}>
        <OutboundFields />
      </OutboundFormSection>
    </FormTestProvider>
  );
  return { onSubmit };
};

const submitAndGetData = async (onSubmit: jest.Mock) => {
  await userEvent.click(screen.getByTestId('form-test-provide-submit'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  return onSubmit.mock.calls[onSubmit.mock.calls.length - 1][0].data;
};

describe('OutboundFormSection', () => {
  it('shows the switch on and the outbound fields by default', () => {
    renderSection();

    expect(screen.getByTestId('connector-outbound-label')).toBeInTheDocument();
    expect(screen.getByTestId('outbound-actions-enabled-switch')).toBeChecked();
    expect(screen.getByTestId('outbound-settings')).toBeVisible();
  });

  it('shows the switch off and hides the outbound fields for a receive-only connector', () => {
    renderSection({ runActions: false });

    expect(screen.getByTestId('outbound-actions-enabled-switch')).not.toBeChecked();
    expect(screen.getByTestId('outbound-settings')).not.toBeVisible();
  });

  it('turning the switch off only sets the Run actions flag', async () => {
    const { onSubmit } = renderSection({ selectedActions: ['listMonitors'] });

    await userEvent.click(screen.getByTestId('outbound-actions-enabled-switch'));

    expect(screen.getByTestId('outbound-actions-enabled-switch')).not.toBeChecked();
    const data = await submitAndGetData(onSubmit);
    expect(data.__internal__.runActions).toBe(false);
    expect(data.secrets.authType).toBe('basic');
    expect(data.config.selectedActions).toEqual(['listMonitors']);
  });

  it('keeps the auth type, credentials, and custom actions when turned off and back on', async () => {
    const { onSubmit } = renderSection({ selectedActions: ['listMonitors'] });

    await userEvent.type(screen.getByTestId('api-key-input'), 'my-key');
    await userEvent.click(screen.getByTestId('outbound-actions-enabled-switch'));
    await userEvent.click(screen.getByTestId('outbound-actions-enabled-switch'));

    expect(screen.getByTestId('outbound-actions-enabled-switch')).toBeChecked();
    expect(screen.getByTestId('outbound-settings')).toBeVisible();
    const data = await submitAndGetData(onSubmit);
    expect(data.__internal__.runActions).toBe(true);
    expect(data.secrets).toEqual({ authType: 'basic', apiKey: 'my-key' });
    expect(data.config.selectedActions).toEqual(['listMonitors']);
  });

  it('disables the switch when the user cannot save connectors', () => {
    renderSection({ canSave: false });

    expect(screen.getByTestId('outbound-actions-enabled-switch')).toBeDisabled();
  });
});
