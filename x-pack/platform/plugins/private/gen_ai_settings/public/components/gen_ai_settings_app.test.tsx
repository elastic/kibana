/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { GenAiSettingsApp } from './gen_ai_settings_app';
import { useEnabledFeatures } from '../contexts/enabled_features_context';
import { SettingsContextProvider } from '../contexts/settings_context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the context hook
jest.mock('../contexts/enabled_features_context');
const mockUseEnabledFeatures = useEnabledFeatures as jest.MockedFunction<typeof useEnabledFeatures>;

describe('GenAiSettingsApp', () => {
  const coreStart = coreMock.createStart();
  const setBreadcrumbs = jest.fn();
  const featureFlagsGetBooleanValueMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    featureFlagsGetBooleanValueMock.mockReturnValue(true);

    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      management: {
        kibana: {
          spaces: true,
        },
      },
    };

    coreStart.featureFlags = {
      ...coreStart.featureFlags,
      getBooleanValue: featureFlagsGetBooleanValueMock,
    };

    // Default mock for enabled features
    mockUseEnabledFeatures.mockReturnValue({
      showSpacesIntegration: true,
      isPermissionsBased: false,
      showAiBreadcrumb: true,
      showAiAssistantsVisibilitySetting: true,
    });
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

      mockUseEnabledFeatures.mockReturnValue({
        showSpacesIntegration: true,
        isPermissionsBased: false,
        showAiBreadcrumb: false,
        showAiAssistantsVisibilitySetting: true,
      });

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

    it('does not render default llm setting when feature is disabled', () => {
      featureFlagsGetBooleanValueMock.mockReturnValue(false);

      renderComponent();

      expect(screen.queryByTestId('defaultAiConnectorComboBox')).not.toBeInTheDocument();
      expect(screen.queryByTestId('defaultAiConnectorCheckbox')).not.toBeInTheDocument();
    });

    it('should conditionally render sections based on settings', () => {
      mockUseEnabledFeatures.mockReturnValue({
        showSpacesIntegration: false,
        isPermissionsBased: false,
        showAiBreadcrumb: true,
        showAiAssistantsVisibilitySetting: true,
      });

      renderComponent();
      expect(screen.queryByTestId('aiFeatureVisibilitySection')).not.toBeInTheDocument();
      expect(screen.queryByTestId('goToSpacesButton')).not.toBeInTheDocument();

      mockUseEnabledFeatures.mockReturnValue({
        showSpacesIntegration: true,
        isPermissionsBased: false,
        showAiBreadcrumb: true,
        showAiAssistantsVisibilitySetting: true,
      });
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
      mockUseEnabledFeatures.mockReturnValue({
        showSpacesIntegration: true,
        isPermissionsBased: true,
        showAiBreadcrumb: true,
        showAiAssistantsVisibilitySetting: true,
      });
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
      mockUseEnabledFeatures.mockReturnValue({
        showSpacesIntegration: true,
        isPermissionsBased: true,
        showAiBreadcrumb: true,
        showAiAssistantsVisibilitySetting: true,
      });
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
});
