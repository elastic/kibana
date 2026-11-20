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
    <UseField path="config.selectedActions">{() => null}</UseField>
    <div data-test-subj="outbound-fields">Datadog keys</div>
  </>
);

const renderSection = ({
  authType,
  selectedActions,
  canSave = true,
}: {
  authType: string;
  selectedActions: string[] | null;
  canSave?: boolean;
}) => {
  const onSubmit = jest.fn();
  render(
    <FormTestProvider
      onSubmit={onSubmit}
      defaultValue={{ secrets: { authType }, config: { selectedActions } }}
    >
      <OutboundFormSection canSave={canSave} credentialedAuthTypeId="basic">
        <OutboundFields />
      </OutboundFormSection>
    </FormTestProvider>
  );
  return { onSubmit };
};

const submitAndGetData = async (onSubmit: jest.Mock) => {
  await userEvent.click(screen.getByTestId('form-test-provide-submit'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  return onSubmit.mock.calls[0][0].data;
};

describe('OutboundFormSection', () => {
  it('shows the switch on and the outbound fields when the connector has credentials', () => {
    renderSection({ authType: 'basic', selectedActions: null });

    expect(screen.getByTestId('connector-outbound-label')).toBeInTheDocument();
    expect(screen.getByTestId('outbound-actions-enabled-switch')).toBeChecked();
    expect(screen.getByTestId('outbound-settings')).toBeVisible();
  });

  it('shows the switch off and hides the outbound fields for a receive-only connector', () => {
    renderSection({ authType: 'none', selectedActions: [] });

    expect(screen.getByTestId('outbound-actions-enabled-switch')).not.toBeChecked();
    expect(screen.getByTestId('outbound-settings')).not.toBeVisible();
  });

  it('turning the switch off sets no authentication and no actions', async () => {
    const { onSubmit } = renderSection({ authType: 'basic', selectedActions: ['listMonitors'] });

    await userEvent.click(screen.getByTestId('outbound-actions-enabled-switch'));

    expect(screen.getByTestId('outbound-actions-enabled-switch')).not.toBeChecked();
    const data = await submitAndGetData(onSubmit);
    expect(data.secrets.authType).toBe('none');
    expect(data.config.selectedActions).toEqual([]);
  });

  it('turning the switch on sets the credentialed auth type and all actions', async () => {
    const { onSubmit } = renderSection({ authType: 'none', selectedActions: [] });

    await userEvent.click(screen.getByTestId('outbound-actions-enabled-switch'));

    expect(screen.getByTestId('outbound-actions-enabled-switch')).toBeChecked();
    expect(screen.getByTestId('outbound-settings')).toBeVisible();
    const data = await submitAndGetData(onSubmit);
    expect(data.secrets.authType).toBe('basic');
    expect(data.config.selectedActions ?? null).toBeNull();
  });

  it('disables the switch when the user cannot save connectors', () => {
    renderSection({ authType: 'basic', selectedActions: null, canSave: false });

    expect(screen.getByTestId('outbound-actions-enabled-switch')).toBeDisabled();
  });
});
