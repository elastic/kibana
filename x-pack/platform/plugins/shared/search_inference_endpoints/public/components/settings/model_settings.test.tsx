/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ModelSettings } from './model_settings';
import { useModelSettingsForm } from './use_model_settings_form';
import { useDefaultModelSettings } from '../../hooks/use_default_model_settings';
import { useConnectors } from '../../hooks/use_connectors';
import { useKibana } from '../../hooks/use_kibana';
import type { InferenceFeatureResponse as InferenceFeatureConfig } from '../../../common/types';

jest.mock('./use_model_settings_form');
jest.mock('../../hooks/use_default_model_settings');
jest.mock('../../hooks/use_connectors');
jest.mock('../../hooks/use_kibana');
jest.mock('./no_models_empty_prompt', () => ({
  NoModelsEmptyPrompt: () => <div data-test-subj="settings-no-models">NoModelsEmptyPrompt</div>,
}));
jest.mock('./feature_section', () => ({
  FeatureSection: ({ parentName, onReset }: { parentName: string; onReset: () => void }) => (
    <div data-test-subj={`featureSection-${parentName}`}>
      <button data-test-subj={`reset-${parentName}`} onClick={onReset}>
        Reset
      </button>
    </div>
  ),
}));
jest.mock('./default_model_section', () => ({
  DefaultModelSection: () => <div data-test-subj="defaultModelSection">DefaultModelSection</div>,
}));

const mockUseModelSettingsForm = useModelSettingsForm as jest.Mock;
const mockUseDefaultModelSettings = useDefaultModelSettings as jest.Mock;
const mockUseConnectors = useConnectors as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;

const mockNavigateToUrl = jest.fn();
const mockBasePath = { prepend: jest.fn((path: string) => path) };

const childFeature: InferenceFeatureConfig = {
  featureId: 'child_1',
  parentFeatureId: 'search',
  featureName: 'Child 1',
  featureDescription: 'desc',
  taskType: 'chat_completion',
  recommendedEndpoints: ['ep-1'],
};

const defaultFormState = {
  isLoading: false,
  isSaving: false,
  isDirty: false,
  assignments: { child_1: ['ep-1'] },
  sections: [
    {
      featureId: 'search',
      featureName: 'Search',
      featureDescription: 'Search features',
      taskType: '',
      recommendedEndpoints: [],
      children: [childFeature],
    },
  ],
  invalidEndpointIds: new Set<string>(),
  updateEndpoints: jest.fn(),
  save: jest.fn(),
  resetSection: jest.fn(),
};

const defaultModelSettingsState = {
  state: { defaultModelId: 'NO_DEFAULT_MODEL', disallowOtherModels: false },
  savedState: { defaultModelId: 'NO_DEFAULT_MODEL', disallowOtherModels: false },
  isDirty: false,
  setDefaultModelId: jest.fn(),
  setDisallowOtherModels: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn(),
};

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>
    <EuiThemeProvider>
      <I18nProvider>{children}</I18nProvider>
    </EuiThemeProvider>
  </MemoryRouter>
);

describe('ModelSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseModelSettingsForm.mockReturnValue(defaultFormState);
    mockUseDefaultModelSettings.mockReturnValue(defaultModelSettingsState);
    mockUseConnectors.mockReturnValue({
      data: [{ connectorId: 'test-connector', name: 'Test', isPreconfigured: true }],
      isLoading: false,
    });
    mockUseKibana.mockReturnValue({
      services: {
        application: { navigateToUrl: mockNavigateToUrl },
        http: { basePath: mockBasePath },
      },
    });
  });

  it('renders loading spinner when loading', () => {
    mockUseModelSettingsForm.mockReturnValue({ ...defaultFormState, isLoading: true });

    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders page header and sections when loaded', () => {
    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    expect(screen.getByTestId('modelSettingsPageHeader')).toBeInTheDocument();
    expect(screen.getByTestId('featureSection-Search')).toBeInTheDocument();
  });

  it('save button is disabled when not dirty', () => {
    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    expect(screen.getByTestId('save-settings-button')).toBeDisabled();
  });

  it('save button is enabled when dirty', () => {
    mockUseModelSettingsForm.mockReturnValue({ ...defaultFormState, isDirty: true });

    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    expect(screen.getByTestId('save-settings-button')).toBeEnabled();
  });

  it('clicking save calls the save function', () => {
    const save = jest.fn();
    mockUseModelSettingsForm.mockReturnValue({ ...defaultFormState, isDirty: true, save });

    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('save-settings-button'));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('renders the default model section', () => {
    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    expect(screen.getByTestId('defaultModelSection')).toBeInTheDocument();
  });

  it('save button is enabled when only default model settings are dirty', () => {
    mockUseDefaultModelSettings.mockReturnValue({ ...defaultModelSettingsState, isDirty: true });

    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    expect(screen.getByTestId('save-settings-button')).toBeEnabled();
  });

  it('shows reset modal and calls resetSection on confirm', async () => {
    const resetSection = jest.fn();
    mockUseModelSettingsForm.mockReturnValue({ ...defaultFormState, resetSection });

    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('reset-Search'));
    expect(screen.getByTestId('resetDefaultsModal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Reset to default'));

    await waitFor(() => {
      expect(resetSection).toHaveBeenCalledWith('search');
    });
    expect(screen.queryByTestId('resetDefaultsModal')).not.toBeInTheDocument();
  });

  it('renders empty state when no sections are registered', () => {
    mockUseModelSettingsForm.mockReturnValue({ ...defaultFormState, sections: [] });

    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    expect(screen.getByTestId('settings-no-features')).toBeInTheDocument();
    expect(screen.getByText('No features registered')).toBeInTheDocument();
  });

  it('dismisses reset modal on cancel', () => {
    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('reset-Search'));
    expect(screen.getByTestId('resetDefaultsModal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByTestId('resetDefaultsModal')).not.toBeInTheDocument();
  });

  it('hides feature sections when disallowOtherModels is true', () => {
    mockUseDefaultModelSettings.mockReturnValue({
      ...defaultModelSettingsState,
      state: { defaultModelId: 'some-model', disallowOtherModels: true },
    });

    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    expect(screen.queryByTestId('featureSection-Search')).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-no-features')).not.toBeInTheDocument();
  });

  it('shows feature sections when disallowOtherModels is false', () => {
    mockUseDefaultModelSettings.mockReturnValue({
      ...defaultModelSettingsState,
      state: { defaultModelId: 'some-model', disallowOtherModels: false },
    });

    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    expect(screen.getByTestId('featureSection-Search')).toBeInTheDocument();
  });

  it('calls both saveFeatures and defaultModelSettings.save when both are dirty', async () => {
    const saveFeatures = jest.fn();
    const saveDefaultModel = jest.fn().mockResolvedValue(undefined);

    mockUseModelSettingsForm.mockReturnValue({
      ...defaultFormState,
      isDirty: true,
      save: saveFeatures,
    });
    mockUseDefaultModelSettings.mockReturnValue({
      ...defaultModelSettingsState,
      isDirty: true,
      save: saveDefaultModel,
    });

    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('save-settings-button'));

    await waitFor(() => {
      expect(saveFeatures).toHaveBeenCalledTimes(1);
      expect(saveDefaultModel).toHaveBeenCalledTimes(1);
    });
  });

  it('only calls defaultModelSettings.save when only default model is dirty', async () => {
    const saveFeatures = jest.fn();
    const saveDefaultModel = jest.fn().mockResolvedValue(undefined);

    mockUseModelSettingsForm.mockReturnValue({
      ...defaultFormState,
      isDirty: false,
      save: saveFeatures,
    });
    mockUseDefaultModelSettings.mockReturnValue({
      ...defaultModelSettingsState,
      isDirty: true,
      save: saveDefaultModel,
    });

    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('save-settings-button'));

    await waitFor(() => {
      expect(saveDefaultModel).toHaveBeenCalledTimes(1);
    });
    expect(saveFeatures).not.toHaveBeenCalled();
  });

  it('renders no-models empty prompt when connectors are empty', () => {
    mockUseConnectors.mockReturnValue({ data: [], isLoading: false });

    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    expect(screen.getByTestId('settings-no-models')).toBeInTheDocument();
    expect(screen.queryByTestId('defaultModelSection')).not.toBeInTheDocument();
  });

  it('renders loading spinner when connectors are loading', () => {
    mockUseConnectors.mockReturnValue({ data: undefined, isLoading: true });

    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('settings-no-models')).not.toBeInTheDocument();
  });

  it('shows unsaved changes modal and navigates away when discard is confirmed', async () => {
    const resetDefaultModel = jest.fn();
    const history = createMemoryHistory();

    mockUseModelSettingsForm.mockReturnValue({ ...defaultFormState, isDirty: true });
    mockUseDefaultModelSettings.mockReturnValue({
      ...defaultModelSettingsState,
      isDirty: true,
      reset: resetDefaultModel,
    });

    render(
      <Router history={history}>
        <EuiThemeProvider>
          <I18nProvider>
            <ModelSettings />
          </I18nProvider>
        </EuiThemeProvider>
      </Router>
    );

    // Trigger navigation while dirty to invoke the history block
    act(() => {
      history.push('/some-other-page');
    });

    // The unsaved changes modal should appear
    await waitFor(() => {
      expect(screen.getByTestId('unsavedChangesModal')).toBeInTheDocument();
    });

    // Click "Discard changes"
    fireEvent.click(screen.getByText('Discard changes'));

    // defaultModelSettings.reset should be called
    expect(resetDefaultModel).toHaveBeenCalledTimes(1);

    // navigateToUrl should be called with the pending destination
    expect(mockNavigateToUrl).toHaveBeenCalledWith('/some-other-page', expect.any(Object));

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('unsavedChangesModal')).not.toBeInTheDocument();
    });
  });

  it('closes unsaved changes modal without navigating when cancel is clicked', async () => {
    const history = createMemoryHistory();

    mockUseModelSettingsForm.mockReturnValue({ ...defaultFormState, isDirty: true });

    render(
      <Router history={history}>
        <EuiThemeProvider>
          <I18nProvider>
            <ModelSettings />
          </I18nProvider>
        </EuiThemeProvider>
      </Router>
    );

    act(() => {
      history.push('/some-other-page');
    });

    await waitFor(() => {
      expect(screen.getByTestId('unsavedChangesModal')).toBeInTheDocument();
    });

    // Click "Cancel"
    fireEvent.click(screen.getByText('Cancel'));

    expect(mockNavigateToUrl).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByTestId('unsavedChangesModal')).not.toBeInTheDocument();
    });
  });
});
