/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { GenAiSettingsApp } from './gen_ai_settings_app';
import { useEnabledFeatures } from '../contexts/enabled_features_context';
import { SettingsContextProvider } from '../contexts/settings_context';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import {
  AI_ASSISTANT_PREFERRED_AI_ASSISTANT_TYPE,
  AI_CHAT_EXPERIENCE_TYPE,
} from '@kbn/management-settings-ids';

// Mock the context hook
jest.mock('../contexts/enabled_features_context');
const mockUseEnabledFeatures = useEnabledFeatures as jest.MockedFunction<typeof useEnabledFeatures>;

describe('GenAiSettingsApp', () => {
  const coreStart = coreMock.createStart();
  const setBreadcrumbs = jest.fn();

  const createSettingsMock = (overrides = {}) => ({
    'genAiSettings:defaultAIConnector': {
      value: 'NO_DEFAULT_CONNECTOR',
      type: 'string',
    },
    'genAiSettings:defaultAIConnectorOnly': {
      value: false,
      type: 'boolean',
    },
    [AI_CHAT_EXPERIENCE_TYPE]: {
      value: AIChatExperience.Classic,
      type: 'select',
      options: [AIChatExperience.Classic, AIChatExperience.Agent],
    },
    [AI_ASSISTANT_PREFERRED_AI_ASSISTANT_TYPE]: {
      value: 'default',
      type: 'select',
      options: ['default'],
    },
    ...overrides,
  });

  const createFeatureFlagsMock = (overrides = {}) => ({
    showSpacesIntegration: true,
    isPermissionsBased: false,
    showAiBreadcrumb: true,
    showAiAssistantsVisibilitySetting: true,
    showChatExperienceSetting: true,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      management: {
        kibana: {
          spaces: true,
        },
      },
      observabilityAIAssistant: { show: true },
      securitySolutionAssistant: { 'ai-assistant': true },
      agentBuilder: { show: true },
    };

    // Mock feature flags to enable AI Agents by default
    jest
      .spyOn(coreStart.featureFlags, 'getBooleanValue')
      .mockImplementation((_flagName: string, _fallbackValue: boolean) => true as boolean);

    // Mock settings client with default settings
    coreStart.settings.client.getAll.mockReturnValue(createSettingsMock() as any);

    // Default mock for enabled features
    mockUseEnabledFeatures.mockReturnValue(createFeatureFlagsMock());
  });

  const renderComponent = (props = {}) => {
    return renderWithI18n(
      <QueryClientProvider client={new QueryClient()}>
        <KibanaContextProvider services={coreStart}>
          <SettingsContextProvider>
            <GenAiSettingsApp setBreadcrumbs={setBreadcrumbs} {...props} />
          </SettingsContextProvider>
        </KibanaContextProvider>
      </QueryClientProvider>
    );
  };

  describe('breadcrumbs', () => {
    it('should set breadcrumbs correctly based on showAiBreadcrumb', () => {
      renderComponent();

      expect(setBreadcrumbs).toHaveBeenCalledWith([
        {
          text: 'AI',
        },
        {
          text: 'GenAI Settings',
        },
      ]);

      jest.clearAllMocks();

      mockUseEnabledFeatures.mockReturnValue(createFeatureFlagsMock({ showAiBreadcrumb: false }));

      renderComponent();

      expect(setBreadcrumbs).toHaveBeenCalledWith([
        {
          text: 'GenAI Settings',
        },
      ]);
    });
  });

  describe('content rendering', () => {
    it('should render all expected sections with default settings', () => {
      renderComponent();

      // Main page section
      expect(screen.getByTestId('genAiSettingsPage')).toBeInTheDocument();
      expect(screen.getByTestId('genAiSettingsTitle')).toBeInTheDocument();

      // Connectors section
      expect(screen.getByTestId('connectorsSection')).toBeInTheDocument();
      expect(screen.getByTestId('connectorsTitle')).toBeInTheDocument();
      expect(screen.getByTestId('defaultAiConnectorComboBox')).toBeInTheDocument();
      expect(screen.getByTestId('defaultAiConnectorCheckbox')).toBeInTheDocument();

      // Feature visibility section (with default settings)
      expect(screen.getByTestId('aiFeatureVisibilitySection')).toBeInTheDocument();
      expect(screen.getByTestId('goToSpacesButton')).toBeInTheDocument();
    });

    it('should conditionally render sections based on settings', () => {
      mockUseEnabledFeatures.mockReturnValue(
        createFeatureFlagsMock({ showSpacesIntegration: false })
      );

      renderComponent();
      expect(screen.queryByTestId('aiFeatureVisibilitySection')).not.toBeInTheDocument();
      expect(screen.queryByTestId('goToSpacesButton')).not.toBeInTheDocument();

      mockUseEnabledFeatures.mockReturnValue(createFeatureFlagsMock());
      coreStart.application.capabilities = {
        ...coreStart.application.capabilities,
        management: {
          kibana: {
            spaces: false,
          },
        },
      };

      renderComponent();
      expect(screen.queryByTestId('aiFeatureVisibilitySection')).not.toBeInTheDocument();
      expect(screen.queryByTestId('goToSpacesButton')).not.toBeInTheDocument();
    });
  });

  describe('permissions-based view', () => {
    it('should render permissions button when isPermissionsBased is true and canManageSpaces is true', () => {
      mockUseEnabledFeatures.mockReturnValue(createFeatureFlagsMock({ isPermissionsBased: true }));
      coreStart.application.capabilities = {
        ...coreStart.application.capabilities,
        management: {
          kibana: {
            spaces: true,
          },
        },
      };

      renderComponent();
      expect(screen.getByTestId('goToPermissionsTabButton')).toBeInTheDocument();
    });

    it('should not render permissions button when canManageSpaces is false', () => {
      mockUseEnabledFeatures.mockReturnValue(createFeatureFlagsMock({ isPermissionsBased: true }));
      coreStart.application.capabilities = {
        ...coreStart.application.capabilities,
        management: {
          kibana: {
            spaces: false,
          },
        },
      };

      renderComponent();
      expect(screen.queryByTestId('goToPermissionsTabButton')).not.toBeInTheDocument();
    });
  });

  describe('AI Chat Experience Setting', () => {
    it('should render chat experience setting section when showChatExperienceSetting is true', async () => {
      mockUseEnabledFeatures.mockReturnValue(createFeatureFlagsMock());

      renderComponent();

      expect(
        await screen.findByTestId(
          'management-settings-editField-aiAssistant:preferredChatExperience'
        )
      ).toBeInTheDocument();
    });

    it('should not render chat experience setting section when showChatExperienceSetting is false', () => {
      mockUseEnabledFeatures.mockReturnValue(
        createFeatureFlagsMock({ showChatExperienceSetting: false })
      );

      renderComponent();

      expect(
        screen.queryByTestId('management-settings-editField-aiAssistant:preferredChatExperience')
      ).not.toBeInTheDocument();
    });
  });

  describe('AI Assistant Visibility conditional rendering', () => {
    it('renders AI Assistant Visibility when chat experience is Classic', async () => {
      mockUseEnabledFeatures.mockReturnValue(createFeatureFlagsMock());

      coreStart.settings.client.getAll.mockReturnValue(createSettingsMock() as any);

      renderComponent();

      expect(
        await screen.findByTestId(
          `management-settings-editField-${AI_ASSISTANT_PREFERRED_AI_ASSISTANT_TYPE}`
        )
      ).toBeInTheDocument();
    });

    it('hides AI Assistant Visibility when chat experience is changed to Agents', async () => {
      mockUseEnabledFeatures.mockReturnValue(createFeatureFlagsMock());

      coreStart.settings.client.getAll.mockReturnValue(createSettingsMock() as any);

      renderComponent();

      // Initially, both fields should be visible (Classic mode)
      const visibilityField = await screen.findByTestId(
        `management-settings-editField-${AI_ASSISTANT_PREFERRED_AI_ASSISTANT_TYPE}`
      );
      expect(visibilityField).toBeInTheDocument();

      const chatExperienceField = await screen.findByTestId(
        `management-settings-editField-${AI_CHAT_EXPERIENCE_TYPE}`
      );
      expect(chatExperienceField).toBeInTheDocument();

      const allSelects = document.querySelectorAll('select');

      const chatExperienceSelect = Array.from(allSelects).find((select) => {
        const options = Array.from(select.querySelectorAll('option'));
        return options.some((opt) => opt.value === AIChatExperience.Agent);
      });

      expect(chatExperienceSelect).toBeTruthy();

      // Change the select value to Agent
      fireEvent.change(chatExperienceSelect!, { target: { value: AIChatExperience.Agent } });

      // After changing to Agent, the AI Assistant Visibility field should be hidden
      await waitFor(() => {
        expect(
          screen.queryByTestId(
            `management-settings-editField-${AI_ASSISTANT_PREFERRED_AI_ASSISTANT_TYPE}`
          )
        ).not.toBeInTheDocument();
      });
    });
  });
});
