/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { ImportSetupFlyout } from './import_setup_flyout';

let mockConnectorTypesState: { data: unknown[] | undefined; isLoading: boolean; isError: boolean } =
  { data: [], isLoading: false, isError: false };

jest.mock('../../hooks/use_import_connector_types', () => ({
  useImportConnectorTypes: () => mockConnectorTypesState,
}));

jest.mock('./custom_import_setup_flyout', () => ({
  CustomImportSetupFlyout: ({ onBack }: { onBack?: () => void }) => (
    <div data-test-subj="mockCustomFlyout">
      <button type="button" onClick={onBack}>
        back from custom
      </button>
    </div>
  ),
}));

jest.mock('./managed_import_setup_flyout', () => ({
  ManagedImportSetupFlyout: ({
    source,
    onBack,
  }: {
    source: { id: string };
    onBack: () => void;
  }) => (
    <div data-test-subj="mockManagedFlyout">
      {source.id}
      <button type="button" onClick={onBack}>
        back from managed
      </button>
    </div>
  ),
}));

const datadogType = {
  id: '.datadog',
  name: 'Datadog',
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'enterprise',
  supportedFeatureIds: ['importAlerts'],
  isSystemActionType: false,
  isDeprecated: false,
};

const renderFlyout = () => {
  const onClose = jest.fn();
  render(
    <I18nProvider>
      <ImportSetupFlyout onClose={onClose} />
    </I18nProvider>
  );
  return { onClose };
};

describe('ImportSetupFlyout', () => {
  beforeEach(() => {
    mockConnectorTypesState = { data: [datadogType], isLoading: false, isError: false };
  });

  it('starts with the source picker', () => {
    renderFlyout();

    expect(screen.getByTestId('importsSetupFlyoutTitle')).toHaveTextContent('Set up import');
    expect(screen.getByTestId('importsSourcePicker')).toBeInTheDocument();
  });

  it('goes to the custom webhook form and back', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await user.click(screen.getByTestId('importsSourceCard-customWebhook'));
    expect(screen.getByTestId('mockCustomFlyout')).toBeInTheDocument();
    await user.click(screen.getByText('back from custom'));

    expect(screen.getByTestId('importsSourcePicker')).toBeInTheDocument();
  });

  it('goes to the managed flow for a connector card and back', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await user.click(screen.getByTestId('importsSourceCard-.datadog'));
    expect(screen.getByTestId('mockManagedFlyout')).toHaveTextContent('.datadog');
    await user.click(screen.getByText('back from managed'));

    expect(screen.getByTestId('importsSourcePicker')).toBeInTheDocument();
  });

  it('still offers the custom webhook when the connector types cannot be loaded', () => {
    mockConnectorTypesState = { data: undefined, isLoading: false, isError: true };
    renderFlyout();

    expect(screen.getByTestId('importsSourcePickerConnectorsError')).toBeInTheDocument();
    expect(screen.getByTestId('importsSourceCard-customWebhook')).toBeInTheDocument();
  });

  it('closes from the footer', async () => {
    const user = userEvent.setup();
    const { onClose } = renderFlyout();

    await user.click(screen.getByTestId('importsSetupCancel'));

    expect(onClose).toHaveBeenCalled();
  });
});
