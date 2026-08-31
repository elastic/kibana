/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateSettingsForm } from './template_settings_form';

// Counts mounts of the (stubbed) connector form so tests can assert the parent remounts it via
// `key` on reset (and does NOT remount it on ordinary edits, which would drop focus).
const mockConnectorFormMounts = { count: 0 };
jest.mock('./template_connector_form', () => {
  const ReactActual = jest.requireActual('react');
  return {
    TemplateConnectorForm: () => {
      ReactActual.useEffect(() => {
        mockConnectorFormMounts.count += 1;
      }, []);
      return ReactActual.createElement('div', { 'data-test-subj': 'mock-connector-form' });
    },
  };
});

const mockUseCasesFeatures = jest.fn(() => ({
  isSyncAlertsEnabled: true,
  observablesAuthorized: true,
  isExtractObservablesEnabled: true,
}));
jest.mock('../../../common/use_cases_features', () => ({
  useCasesFeatures: () => mockUseCasesFeatures(),
}));

describe('TemplateSettingsForm', () => {
  const base = {
    onSettingsChange: jest.fn(),
    onConnectorChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectorFormMounts.count = 0;
    mockUseCasesFeatures.mockReturnValue({
      isSyncAlertsEnabled: true,
      observablesAuthorized: true,
      isExtractObservablesEnabled: true,
    });
  });

  it('reflects the current settings in the toggles and renders the connector form', () => {
    render(
      <TemplateSettingsForm {...base} settings={{ syncAlerts: true, extractObservables: false }} />
    );

    expect(screen.getByTestId('templateSettingsSyncAlertsSwitch')).toBeChecked();
    expect(screen.getByTestId('templateSettingsExtractObservablesSwitch')).not.toBeChecked();
    expect(screen.getByTestId('mock-connector-form')).toBeInTheDocument();
  });

  it('defaults toggles to off when settings are undefined', () => {
    render(<TemplateSettingsForm {...base} />);

    expect(screen.getByTestId('templateSettingsSyncAlertsSwitch')).not.toBeChecked();
    expect(screen.getByTestId('templateSettingsExtractObservablesSwitch')).not.toBeChecked();
  });

  it('calls onSettingsChange when toggling sync alerts', async () => {
    const user = userEvent.setup();
    const onSettingsChange = jest.fn();
    render(
      <TemplateSettingsForm
        {...base}
        onSettingsChange={onSettingsChange}
        settings={{ syncAlerts: false }}
      />
    );

    await user.click(screen.getByTestId('templateSettingsSyncAlertsSwitch'));

    expect(onSettingsChange).toHaveBeenCalledWith({
      syncAlerts: true,
      extractObservables: false,
    });
  });

  it('preserves other settings when toggling one', async () => {
    const user = userEvent.setup();
    const onSettingsChange = jest.fn();
    render(
      <TemplateSettingsForm
        {...base}
        onSettingsChange={onSettingsChange}
        settings={{ syncAlerts: true, extractObservables: false }}
      />
    );

    await user.click(screen.getByTestId('templateSettingsExtractObservablesSwitch'));

    expect(onSettingsChange).toHaveBeenCalledWith({ syncAlerts: true, extractObservables: true });
  });

  it('remounts the connector form only when formResetKey changes, not on ordinary edits', () => {
    const connector = { type: '.jira', id: 'jira-1', fields: null } as never;
    const { rerender } = render(
      <TemplateSettingsForm {...base} connector={connector} formResetKey={0} />
    );

    expect(mockConnectorFormMounts.count).toBe(1);

    // An ordinary edit (settings change, same formResetKey) must not remount the connector form,
    // otherwise its dynamic-field inputs would lose focus mid-typing.
    rerender(
      <TemplateSettingsForm
        {...base}
        connector={connector}
        settings={{ syncAlerts: true }}
        formResetKey={0}
      />
    );
    expect(mockConnectorFormMounts.count).toBe(1);

    // A reset bumps formResetKey, remounting the connector form so it re-seeds from the reverted
    // connector (its inner form only reads its defaultValue at mount).
    rerender(<TemplateSettingsForm {...base} connector={connector} formResetKey={1} />);
    expect(mockConnectorFormMounts.count).toBe(2);
  });

  it('hides the sync alerts toggle when alert syncing is disabled (e.g. Observability)', () => {
    mockUseCasesFeatures.mockReturnValue({
      isSyncAlertsEnabled: false,
      observablesAuthorized: true,
      isExtractObservablesEnabled: true,
    });

    render(
      <TemplateSettingsForm {...base} settings={{ syncAlerts: true, extractObservables: false }} />
    );

    expect(screen.queryByTestId('templateSettingsSyncAlertsSwitch')).not.toBeInTheDocument();
    expect(screen.getByTestId('templateSettingsExtractObservablesSwitch')).toBeInTheDocument();
  });

  it('hides the extract observables toggle when the feature is unavailable (e.g. Observability/Stack)', () => {
    mockUseCasesFeatures.mockReturnValue({
      isSyncAlertsEnabled: true,
      observablesAuthorized: true,
      isExtractObservablesEnabled: false,
    });

    render(
      <TemplateSettingsForm {...base} settings={{ syncAlerts: true, extractObservables: false }} />
    );

    expect(
      screen.queryByTestId('templateSettingsExtractObservablesSwitch')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('templateSettingsSyncAlertsSwitch')).toBeInTheDocument();
  });
});
