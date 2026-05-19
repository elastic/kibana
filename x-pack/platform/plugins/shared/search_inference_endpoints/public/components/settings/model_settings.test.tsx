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
import { useDefaultModelValidation } from '../../hooks/use_default_model_validation';
import { useConnectors } from '../../hooks/use_connectors';
import { useKibana } from '../../hooks/use_kibana';
import { NO_DEFAULT_MODEL } from '../../../common/constants';
import type { InferenceFeatureResponse as InferenceFeatureConfig } from '../../../common/types';

jest.mock('./use_model_settings_form');
jest.mock('../../hooks/use_default_model_settings');
jest.mock('../../hooks/use_default_model_validation');
jest.mock('../../hooks/use_connectors');
jest.mock('../../hooks/use_kibana');
jest.mock('./no_models_empty_prompt', () => ({
  NoModelsEmptyPrompt: () => <div data-test-subj="settings-no-models">NoModelsEmptyPrompt</div>,
}));
jest.mock('./feature_section', () => ({
  FeatureSection: ({ parentName }: { parentName: string }) => (
    <div data-test-subj={`featureSection-${parentName}`} />
  ),
}));
jest.mock('./default_model_section', () => ({
  DefaultModelSection: () => <div data-test-subj="defaultModelSection">DefaultModelSection</div>,
}));

const mockUseModelSettingsForm = useModelSettingsForm as jest.Mock;
const mockUseDefaultModelSettings = useDefaultModelSettings as jest.Mock;
const mockUseDefaultModelValidation = useDefaultModelValidation as jest.Mock;
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

const optOutChildFeature: InferenceFeatureConfig = {
  featureId: 'child_opt_out',
  parentFeatureId: 'workflows',
  featureName: 'Workflow Feature',
  featureDescription: 'runs in background',
  taskType: 'chat_completion',
  recommendedEndpoints: [],
  ignoreGlobalDefault: true,
};

const defaultFormState = {
  isLoading: false,
  isSaving: false,
  isDirty: false,
  assignments: { child_1: ['ep-1'] },
  effectiveRecommendedEndpoints: { child_1: ['ep-1'] },
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
  hasSavedObject: {} as Record<string, boolean>,
  dirtyFeatureIds: new Set<string>() as ReadonlySet<string>,
  updateEndpoints: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
};

const defaultModelSettingsState = {
  state: { enableAi: true, defaultModelId: 'pre-1', featureSpecificModels: true },
  isDirty: false,
  setEnableAi: jest.fn(),
  setDefaultModelId: jest.fn(),
  setFeatureSpecificModels: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn(),
};

const validValidation = {
  errors: [],
  isValid: true,
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
    mockUseDefaultModelValidation.mockReturnValue(validValidation);
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

  it('renders page header and the default-model section when loaded', () => {
    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    expect(screen.getByTestId('modelSettingsPageHeader')).toBeInTheDocument();
    expect(screen.getByTestId('defaultModelSection')).toBeInTheDocument();
  });

  it('shows feature sections when AI is on and Feature specific models is on', () => {
    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    expect(screen.getByTestId('featureSection-Search')).toBeInTheDocument();
  });

  it('hides feature sections when AI is on but Feature specific models is off', () => {
    mockUseDefaultModelSettings.mockReturnValue({
      ...defaultModelSettingsState,
      state: { enableAi: true, defaultModelId: 'pre-1', featureSpecificModels: false },
    });

    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    expect(screen.queryByTestId('featureSection-Search')).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-no-features')).not.toBeInTheDocument();
  });

  it('hides feature sections when AI is off', () => {
    mockUseDefaultModelSettings.mockReturnValue({
      ...defaultModelSettingsState,
      state: { enableAi: false, defaultModelId: NO_DEFAULT_MODEL, featureSpecificModels: false },
    });

    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    expect(screen.queryByTestId('featureSection-Search')).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-no-features')).not.toBeInTheDocument();
  });

  it('save button is disabled when not dirty', () => {
    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    expect(screen.getByTestId('save-settings-button')).toBeDisabled();
  });

  it('save button is enabled when feature settings are dirty', () => {
    mockUseModelSettingsForm.mockReturnValue({ ...defaultFormState, isDirty: true });

    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    expect(screen.getByTestId('save-settings-button')).toBeEnabled();
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

  it('save button stays disabled when validation fails, even if dirty', () => {
    mockUseDefaultModelSettings.mockReturnValue({
      ...defaultModelSettingsState,
      isDirty: true,
    });
    mockUseDefaultModelValidation.mockReturnValue({
      errors: ['Select a default model to save changes.'],
      isValid: false,
    });

    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    expect(screen.getByTestId('save-settings-button')).toBeDisabled();
  });

  it('clicking save is a no-op when validation fails', () => {
    const saveFeatures = jest.fn().mockResolvedValue(undefined);
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
    mockUseDefaultModelValidation.mockReturnValue({
      errors: ['Select a default model to save changes.'],
      isValid: false,
    });

    render(
      <Wrapper>
        <ModelSettings />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('save-settings-button'));

    expect(saveFeatures).not.toHaveBeenCalled();
    expect(saveDefaultModel).not.toHaveBeenCalled();
  });

  it('calls both saveFeatures and defaultModelSettings.save when both are dirty', async () => {
    const saveFeatures = jest.fn().mockResolvedValue(undefined);
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

    act(() => {
      history.push('/some-other-page');
    });

    await waitFor(() => {
      expect(screen.getByTestId('unsavedChangesModal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Discard changes'));

    expect(resetDefaultModel).toHaveBeenCalledTimes(1);
    expect(mockNavigateToUrl).toHaveBeenCalledWith('/some-other-page', expect.any(Object));

    await waitFor(() => {
      expect(screen.queryByTestId('unsavedChangesModal')).not.toBeInTheDocument();
    });
  });

  describe('deprecated/EOL assigned models callouts', () => {
    const gaConnector = {
      connectorId: 'ep-ga',
      name: 'GA Model',
      isPreconfigured: true,
      metadata: { heuristics: { status: 'ga', end_of_life_date: '2099-01-01' } },
    };
    const deprecatedConnector = {
      connectorId: 'ep-dep',
      name: 'Deprecated Model',
      isPreconfigured: true,
      metadata: { heuristics: { status: 'deprecated', end_of_life_date: '2099-01-01' } },
    };
    const eolConnector = {
      connectorId: 'ep-eol',
      name: 'EOL Model',
      isPreconfigured: true,
      metadata: { heuristics: { status: 'deprecated', end_of_life_date: '2020-01-01' } },
    };

    it('does not render either callout when only GA connectors are assigned', () => {
      mockUseConnectors.mockReturnValue({ data: [gaConnector], isLoading: false });

      render(
        <Wrapper>
          <ModelSettings />
        </Wrapper>
      );

      expect(screen.queryByTestId('deprecatedModelsCallout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('eolModelsCallout')).not.toBeInTheDocument();
    });

    it('renders the warning callout when a deprecated connector is assigned to a feature', () => {
      mockUseConnectors.mockReturnValue({
        data: [deprecatedConnector],
        isLoading: false,
      });
      mockUseModelSettingsForm.mockReturnValue({
        ...defaultFormState,
        assignments: { child_1: ['ep-dep'] },
      });

      render(
        <Wrapper>
          <ModelSettings />
        </Wrapper>
      );

      const callout = screen.getByTestId('deprecatedModelsCallout');
      expect(callout).toBeInTheDocument();
      expect(callout).toHaveTextContent('Deprecated Model');
      expect(screen.queryByTestId('eolModelsCallout')).not.toBeInTheDocument();
    });

    it('renders the danger callout when an EOL connector is assigned to a feature', () => {
      mockUseConnectors.mockReturnValue({ data: [eolConnector], isLoading: false });
      mockUseModelSettingsForm.mockReturnValue({
        ...defaultFormState,
        assignments: { child_1: ['ep-eol'] },
      });

      render(
        <Wrapper>
          <ModelSettings />
        </Wrapper>
      );

      const callout = screen.getByTestId('eolModelsCallout');
      expect(callout).toBeInTheDocument();
      expect(callout).toHaveTextContent('EOL Model');
      expect(screen.queryByTestId('deprecatedModelsCallout')).not.toBeInTheDocument();
    });

    it('includes the deprecated default model in the warning callout', () => {
      mockUseConnectors.mockReturnValue({
        data: [deprecatedConnector],
        isLoading: false,
      });
      mockUseDefaultModelSettings.mockReturnValue({
        ...defaultModelSettingsState,
        state: {
          enableAi: true,
          defaultModelId: 'ep-dep',
          featureSpecificModels: true,
        },
      });
      mockUseModelSettingsForm.mockReturnValue({
        ...defaultFormState,
        assignments: { child_1: ['ep-1'] },
      });

      render(
        <Wrapper>
          <ModelSettings />
        </Wrapper>
      );

      expect(screen.getByTestId('deprecatedModelsCallout')).toHaveTextContent('Deprecated Model');
    });

    it('renders both callouts when both deprecated and EOL connectors are assigned', () => {
      mockUseConnectors.mockReturnValue({
        data: [deprecatedConnector, eolConnector],
        isLoading: false,
      });
      mockUseModelSettingsForm.mockReturnValue({
        ...defaultFormState,
        assignments: { child_1: ['ep-dep', 'ep-eol'] },
      });

      render(
        <Wrapper>
          <ModelSettings />
        </Wrapper>
      );

      expect(screen.getByTestId('deprecatedModelsCallout')).toHaveTextContent('Deprecated Model');
      expect(screen.getByTestId('eolModelsCallout')).toHaveTextContent('EOL Model');
    });

    it('hides callouts when featureSpecificModels is off, even with deprecated connectors assigned', () => {
      mockUseConnectors.mockReturnValue({
        data: [deprecatedConnector, eolConnector],
        isLoading: false,
      });
      mockUseDefaultModelSettings.mockReturnValue({
        ...defaultModelSettingsState,
        state: { enableAi: true, defaultModelId: 'pre-1', featureSpecificModels: false },
      });
      mockUseModelSettingsForm.mockReturnValue({
        ...defaultFormState,
        assignments: { child_1: ['ep-dep', 'ep-eol'] },
      });

      render(
        <Wrapper>
          <ModelSettings />
        </Wrapper>
      );

      expect(screen.queryByTestId('deprecatedModelsCallout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('eolModelsCallout')).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByText('Cancel'));

    expect(mockNavigateToUrl).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByTestId('unsavedChangesModal')).not.toBeInTheDocument();
    });
  });

  describe('ignoreGlobalDefault sections', () => {
    const optOutFormState = {
      ...defaultFormState,
      sections: [
        {
          featureId: 'workflows',
          featureName: 'Workflows',
          featureDescription: 'Background workflows',
          taskType: '',
          recommendedEndpoints: [],
          children: [optOutChildFeature],
        },
      ],
    };

    it('hides opt-out sections when featureSpecificModels is off', () => {
      mockUseModelSettingsForm.mockReturnValue(optOutFormState);
      mockUseDefaultModelSettings.mockReturnValue({
        ...defaultModelSettingsState,
        state: { enableAi: true, defaultModelId: 'pre-1', featureSpecificModels: false },
      });

      render(
        <Wrapper>
          <ModelSettings />
        </Wrapper>
      );

      expect(screen.queryByTestId('featureSection-Workflows')).not.toBeInTheDocument();
    });

    it('renders opt-out sections when featureSpecificModels is on', () => {
      mockUseModelSettingsForm.mockReturnValue(optOutFormState);

      render(
        <Wrapper>
          <ModelSettings />
        </Wrapper>
      );

      expect(screen.getByTestId('featureSection-Workflows')).toBeInTheDocument();
    });

    it('hides opt-out sections when enableAi is off', () => {
      mockUseModelSettingsForm.mockReturnValue(optOutFormState);
      mockUseDefaultModelSettings.mockReturnValue({
        ...defaultModelSettingsState,
        state: { enableAi: false, defaultModelId: 'pre-1', featureSpecificModels: false },
      });

      render(
        <Wrapper>
          <ModelSettings />
        </Wrapper>
      );

      expect(screen.queryByTestId('featureSection-Workflows')).not.toBeInTheDocument();
    });

    it('does not render regular sections in default-only mode', () => {
      mockUseDefaultModelSettings.mockReturnValue({
        ...defaultModelSettingsState,
        state: { enableAi: true, defaultModelId: 'pre-1', featureSpecificModels: false },
      });

      render(
        <Wrapper>
          <ModelSettings />
        </Wrapper>
      );

      expect(screen.queryByTestId('featureSection-Search')).not.toBeInTheDocument();
    });
  });
});
