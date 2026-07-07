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

jest.mock('./template_connector_form', () => ({
  TemplateConnectorForm: () => <div data-test-subj="mock-connector-form" />,
}));

const mockUseCasesFeatures = jest.fn(() => ({ isSyncAlertsEnabled: true }));
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
    mockUseCasesFeatures.mockReturnValue({ isSyncAlertsEnabled: true });
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

    expect(onSettingsChange).toHaveBeenCalledWith({ syncAlerts: true });
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

  it('hides the sync alerts toggle when alert syncing is disabled (e.g. Observability)', () => {
    mockUseCasesFeatures.mockReturnValue({ isSyncAlertsEnabled: false });

    render(
      <TemplateSettingsForm {...base} settings={{ syncAlerts: true, extractObservables: false }} />
    );

    expect(screen.queryByTestId('templateSettingsSyncAlertsSwitch')).not.toBeInTheDocument();
    // Extract observables remains available regardless of the alert-sync feature.
    expect(screen.getByTestId('templateSettingsExtractObservablesSwitch')).toBeInTheDocument();
  });
});
