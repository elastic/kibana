/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { DefaultModelSection } from './default_model_section';
import { useConnectors } from '../../hooks/use_connectors';
import type { UseDefaultModelSettingsReturn } from '../../hooks/use_default_model_settings';
import type { DefaultModelValidationResult } from '../../hooks/use_default_model_validation';
import { NO_DEFAULT_MODEL } from '../../../common/constants';

jest.mock('../../hooks/use_connectors');

const mockUseConnectors = useConnectors as jest.Mock;

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiThemeProvider>
    <I18nProvider>{children}</I18nProvider>
  </EuiThemeProvider>
);

const createMockSettings = (
  overrides: Partial<UseDefaultModelSettingsReturn> = {}
): UseDefaultModelSettingsReturn => ({
  state: { enableAi: true, defaultModelId: 'pre-1', disallowOtherModels: false },
  savedState: { enableAi: true, defaultModelId: 'pre-1', disallowOtherModels: false },
  isDirty: false,
  setEnableAi: jest.fn(),
  setDefaultModelId: jest.fn(),
  setDisallowOtherModels: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn(),
  ...overrides,
});

const validValidation: DefaultModelValidationResult = {
  errors: [],
  isValid: true,
  missingDefaultModel: false,
};

describe('DefaultModelSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConnectors.mockReturnValue({
      data: [
        { connectorId: 'pre-1', name: 'Elastic Model', isPreconfigured: true },
        { connectorId: 'custom-1', name: 'My Connector', isPreconfigured: false },
      ],
      isLoading: false,
    });
  });

  it('renders the Enable AI master toggle', () => {
    render(
      <Wrapper>
        <DefaultModelSection
          defaultModelSettings={createMockSettings()}
          validation={validValidation}
        />
      </Wrapper>
    );

    expect(screen.getByTestId('enableAiTitle')).toHaveTextContent('Enable AI features');
    expect(screen.getByTestId('enableAiSwitch')).toBeInTheDocument();
  });

  it('shows combo box and hide-selection switch when AI is enabled', () => {
    render(
      <Wrapper>
        <DefaultModelSection
          defaultModelSettings={createMockSettings()}
          validation={validValidation}
        />
      </Wrapper>
    );

    expect(screen.getByTestId('defaultModelTitle')).toBeInTheDocument();
    expect(screen.getByTestId('defaultModelComboBox')).toBeInTheDocument();
    expect(screen.getByTestId('disallowOtherModelsCheckbox')).toBeInTheDocument();
  });

  it('keeps the default-model section visible but disables the combobox when AI is off, and hides the hide-selection switch', () => {
    const settings = createMockSettings({
      state: { enableAi: false, defaultModelId: NO_DEFAULT_MODEL, disallowOtherModels: true },
    });

    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={settings} validation={validValidation} />
      </Wrapper>
    );

    expect(screen.getByTestId('defaultModelTitle')).toBeInTheDocument();
    const combo = screen.getByTestId('defaultModelComboBox');
    expect(combo).toBeInTheDocument();
    // EuiComboBox exposes a search input internally; when isDisabled is true it
    // marks the input as disabled.
    expect(combo.querySelector('input')).toBeDisabled();
    expect(screen.queryByTestId('disallowOtherModelsCheckbox')).not.toBeInTheDocument();
  });

  it('calls setEnableAi when the master toggle is flipped', () => {
    const setEnableAi = jest.fn();
    const settings = createMockSettings({ setEnableAi });

    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={settings} validation={validValidation} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('enableAiSwitch'));
    expect(setEnableAi).toHaveBeenCalledWith(false);
  });

  it('renders validation errors passed from the parent', () => {
    const settings = createMockSettings({
      state: { enableAi: true, defaultModelId: NO_DEFAULT_MODEL, disallowOtherModels: true },
    });

    render(
      <Wrapper>
        <DefaultModelSection
          defaultModelSettings={settings}
          validation={{
            errors: ['Select a default model before hiding model selection within features.'],
            isValid: false,
            missingDefaultModel: true,
          }}
        />
      </Wrapper>
    );

    expect(
      screen.getByText('Select a default model before hiding model selection within features.')
    ).toBeInTheDocument();
  });

  it('combobox exposes an explicit "No default model" option so AI on / no default stays reachable', () => {
    render(
      <Wrapper>
        <DefaultModelSection
          defaultModelSettings={createMockSettings()}
          validation={validValidation}
        />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('defaultModelComboBox'));
    expect(screen.getByRole('option', { name: 'No default model' })).toBeInTheDocument();
  });

  it('picking "No default model" sets the default back to NO_DEFAULT_MODEL', () => {
    const setDefaultModelId = jest.fn();
    const settings = createMockSettings({ setDefaultModelId });

    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={settings} validation={validValidation} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('defaultModelComboBox'));
    fireEvent.click(screen.getByRole('option', { name: 'No default model' }));

    expect(setDefaultModelId).toHaveBeenCalledWith(NO_DEFAULT_MODEL);
  });

  it('calls setDisallowOtherModels when hide-selection switch is toggled', () => {
    const setDisallowOtherModels = jest.fn();
    const settings = createMockSettings({ setDisallowOtherModels });

    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={settings} validation={validValidation} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('disallowOtherModelsCheckbox'));
    expect(setDisallowOtherModels).toHaveBeenCalledWith(true);
  });

  it('shows the "features will only use the default model" description when disallow is on', () => {
    const settings = createMockSettings({
      state: { enableAi: true, defaultModelId: 'pre-1', disallowOtherModels: true },
    });

    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={settings} validation={validValidation} />
      </Wrapper>
    );

    expect(screen.getByText('Features will only use the default model.')).toBeInTheDocument();
  });

  it('shows the "features can allow multiple models" description when disallow is off', () => {
    render(
      <Wrapper>
        <DefaultModelSection
          defaultModelSettings={createMockSettings()}
          validation={validValidation}
        />
      </Wrapper>
    );

    expect(
      screen.getByText('Features can allow multiple models to be chosen from their UI.')
    ).toBeInTheDocument();
  });
});
