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

const validResult: DefaultModelValidationResult = {
  errors: [],
  isValid: true,
};

const createMockSettings = (
  overrides: Partial<UseDefaultModelSettingsReturn> = {}
): UseDefaultModelSettingsReturn => ({
  state: { enableAi: true, defaultModelId: 'pre-1', featureSpecificModels: true },
  isDirty: false,
  setEnableAi: jest.fn(),
  setDefaultModelId: jest.fn(),
  setFeatureSpecificModels: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn(),
  ...overrides,
});

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

  it('renders only the AI capabilities row when AI is off', () => {
    const settings = createMockSettings({
      state: { enableAi: false, defaultModelId: NO_DEFAULT_MODEL, featureSpecificModels: false },
    });

    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={settings} validation={validResult} />
      </Wrapper>
    );

    expect(screen.getByTestId('aiCapabilitiesRow')).toBeInTheDocument();
    expect(screen.getByTestId('enableAiSwitch')).toBeInTheDocument();
    expect(screen.queryByTestId('globalModelRow')).not.toBeInTheDocument();
    expect(screen.queryByTestId('featureSpecificModelsRow')).not.toBeInTheDocument();
  });

  it('renders all three rows when AI is on', () => {
    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={createMockSettings()} validation={validResult} />
      </Wrapper>
    );

    expect(screen.getByTestId('aiCapabilitiesRow')).toBeInTheDocument();
    expect(screen.getByTestId('globalModelRow')).toBeInTheDocument();
    expect(screen.getByTestId('featureSpecificModelsRow')).toBeInTheDocument();
    expect(screen.getByTestId('globalModelComboBox')).toBeInTheDocument();
    expect(screen.getByTestId('featureSpecificModelsSwitch')).toBeInTheDocument();
  });

  it('toggling Use AI features calls setEnableAi', () => {
    const setEnableAi = jest.fn();
    const settings = createMockSettings({
      state: { enableAi: false, defaultModelId: NO_DEFAULT_MODEL, featureSpecificModels: false },
      setEnableAi,
    });

    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={settings} validation={validResult} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('enableAiSwitch'));
    expect(setEnableAi).toHaveBeenCalledWith(true);
  });

  it('toggling Feature specific models calls setFeatureSpecificModels', () => {
    const setFeatureSpecificModels = jest.fn();
    const settings = createMockSettings({ setFeatureSpecificModels });

    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={settings} validation={validResult} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('featureSpecificModelsSwitch'));
    expect(setFeatureSpecificModels).toHaveBeenCalledWith(false);
  });

  it('renders validation errors on the global model field when AI is on and a global default is required', () => {
    const settings = createMockSettings({
      state: { enableAi: true, defaultModelId: NO_DEFAULT_MODEL, featureSpecificModels: false },
    });
    const invalid: DefaultModelValidationResult = {
      errors: ['Select a default model to save changes.'],
      isValid: false,
    };

    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={settings} validation={invalid} />
      </Wrapper>
    );

    expect(screen.getByText(/Select a default model/)).toBeInTheDocument();
  });

  it('connectors loading shows a loading combobox', () => {
    mockUseConnectors.mockReturnValue({ data: undefined, isLoading: true });

    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={createMockSettings()} validation={validResult} />
      </Wrapper>
    );

    expect(screen.getByTestId('globalModelComboBox')).toBeInTheDocument();
  });
});
