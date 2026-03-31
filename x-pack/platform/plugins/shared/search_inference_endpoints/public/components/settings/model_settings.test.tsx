/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ModelSettings } from './model_settings';
import { useModelSettingsForm } from './use_model_settings_form';
import type { InferenceFeatureResponse as InferenceFeatureConfig } from '../../../common/types';

jest.mock('./use_model_settings_form');
jest.mock('./feature_section', () => ({
  FeatureSection: ({ parentName, onReset }: { parentName: string; onReset: () => void }) => (
    <div data-test-subj={`featureSection-${parentName}`}>
      <button data-test-subj={`reset-${parentName}`} onClick={onReset}>
        Reset
      </button>
    </div>
  ),
}));

const mockUseModelSettingsForm = useModelSettingsForm as jest.Mock;

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
  updateEndpoints: jest.fn(),
  save: jest.fn(),
  resetSection: jest.fn(),
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
});
