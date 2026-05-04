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
import { useConnectorExists } from '../../hooks/use_connector_exists';
import type { UseDefaultModelSettingsReturn } from '../../hooks/use_default_model_settings';
import { NO_DEFAULT_MODEL } from '../../../common/constants';

jest.mock('../../hooks/use_connectors');
jest.mock('../../hooks/use_connector_exists');

const mockUseConnectors = useConnectors as jest.Mock;
const mockUseConnectorExists = useConnectorExists as jest.Mock;

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiThemeProvider>
    <I18nProvider>{children}</I18nProvider>
  </EuiThemeProvider>
);

const createMockSettings = (
  overrides: Partial<UseDefaultModelSettingsReturn> = {}
): UseDefaultModelSettingsReturn => ({
  state: { defaultModelId: NO_DEFAULT_MODEL, disallowOtherModels: false },
  savedState: { defaultModelId: NO_DEFAULT_MODEL, disallowOtherModels: false },
  isDirty: false,
  setDefaultModelId: jest.fn(),
  setDisallowOtherModels: jest.fn(),
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
    mockUseConnectorExists.mockReturnValue({ exists: true, loading: false });
  });

  it('renders the title and description', () => {
    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={createMockSettings()} />
      </Wrapper>
    );

    expect(screen.getByTestId('defaultModelTitle')).toHaveTextContent('Default model');
  });

  it('renders combo box and checkbox', () => {
    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={createMockSettings()} />
      </Wrapper>
    );

    expect(screen.getByTestId('defaultModelComboBox')).toBeInTheDocument();
    expect(screen.getByTestId('disallowOtherModelsCheckbox')).toBeInTheDocument();
  });

  it('shows validation error when disallow is checked without a default model', () => {
    const settings = createMockSettings({
      state: { defaultModelId: NO_DEFAULT_MODEL, disallowOtherModels: true },
    });

    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={settings} />
      </Wrapper>
    );

    expect(
      screen.getByText(/When disallowing all other models, a default model must be selected/)
    ).toBeInTheDocument();
  });

  it('shows validation error when selected connector does not exist', () => {
    mockUseConnectorExists.mockReturnValue({ exists: false, loading: false });

    const settings = createMockSettings({
      state: { defaultModelId: 'deleted-connector', disallowOtherModels: false },
    });

    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={settings} />
      </Wrapper>
    );

    expect(screen.getByText(/The model previously selected is not available/)).toBeInTheDocument();
  });

  it('calls setDisallowOtherModels when checkbox is toggled', () => {
    const setDisallowOtherModels = jest.fn();
    const settings = createMockSettings({ setDisallowOtherModels });

    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={settings} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('disallowOtherModelsCheckbox'));
    expect(setDisallowOtherModels).toHaveBeenCalledWith(true);
  });

  it('shows loading state when connectors are loading', () => {
    mockUseConnectors.mockReturnValue({ data: undefined, isLoading: true });

    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={createMockSettings()} />
      </Wrapper>
    );

    expect(screen.getByTestId('defaultModelComboBox')).toBeInTheDocument();
  });

  it('does not show connector-not-exist error while connector existence is loading', () => {
    mockUseConnectorExists.mockReturnValue({ exists: false, loading: true });

    const settings = createMockSettings({
      state: { defaultModelId: 'some-connector', disallowOtherModels: false },
    });

    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={settings} />
      </Wrapper>
    );

    expect(
      screen.queryByText(/The model previously selected is not available/)
    ).not.toBeInTheDocument();
  });

  it('shows disallow description text when disallowOtherModels is true', () => {
    const settings = createMockSettings({
      state: { defaultModelId: 'pre-1', disallowOtherModels: true },
    });

    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={settings} />
      </Wrapper>
    );

    expect(
      screen.getByText('Model selection is hidden and only the default model will be used.')
    ).toBeInTheDocument();
  });

  it('shows allow description text when disallowOtherModels is false', () => {
    const settings = createMockSettings({
      state: { defaultModelId: 'pre-1', disallowOtherModels: false },
    });

    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={settings} />
      </Wrapper>
    );

    expect(
      screen.getByText('Users can choose between multiple models for each feature.')
    ).toBeInTheDocument();
  });

  it('does not show validation errors when connector exists and no disallow conflict', () => {
    mockUseConnectorExists.mockReturnValue({ exists: true, loading: false });

    const settings = createMockSettings({
      state: { defaultModelId: 'pre-1', disallowOtherModels: true },
    });

    render(
      <Wrapper>
        <DefaultModelSection defaultModelSettings={settings} />
      </Wrapper>
    );

    expect(
      screen.queryByText(/The model previously selected is not available/)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/When disallowing all other models, a default model must be selected/)
    ).not.toBeInTheDocument();
  });
});
