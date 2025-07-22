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
import { GenAiSettingsApp } from './gen_ai_settings_app';
import { useEnabledFeatures } from '../contexts/serverless_context';

// Mock the context hook
jest.mock('../contexts/serverless_context');
const mockUseEnabledFeatures = useEnabledFeatures as jest.MockedFunction<typeof useEnabledFeatures>;

describe('GenAiSettingsApp', () => {
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let setBreadcrumbs: jest.MockedFunction<any>;

  beforeEach(() => {
    coreStart = coreMock.createStart();
    setBreadcrumbs = jest.fn();

    // Default mock for enabled features
    mockUseEnabledFeatures.mockReturnValue({
      showSpacesIntegration: true,
      isPermissionsBased: false,
      showAiBreadcrumb: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return renderWithI18n(
      <GenAiSettingsApp setBreadcrumbs={setBreadcrumbs} coreStart={coreStart} {...props} />
    );
  };

  describe('breadcrumbs', () => {
    it('should set breadcrumbs with AI breadcrumb when showAiBreadcrumb is true', () => {
      renderComponent();

      expect(setBreadcrumbs).toHaveBeenCalledWith([
        {
          text: 'AI',
        },
        {
          text: 'GenAI Settings',
        },
      ]);
    });

    it('should set breadcrumbs without AI breadcrumb when showAiBreadcrumb is false', () => {
      mockUseEnabledFeatures.mockReturnValue({
        showSpacesIntegration: true,
        isPermissionsBased: false,
        showAiBreadcrumb: false,
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
    it('should render the main page section', () => {
      renderComponent();

      expect(screen.getByTestId('genAiSettingsPage')).toBeInTheDocument();
      expect(screen.getByTestId('genAiSettingsTitle')).toBeInTheDocument();
    });

    it('should render connectors section', () => {
      renderComponent();

      expect(screen.getByTestId('connectorsSection')).toBeInTheDocument();
      expect(screen.getByTestId('connectorsTitle')).toBeInTheDocument();
      expect(screen.getByTestId('manageConnectorsLink')).toBeInTheDocument();
    });

    it('should render ai feature visibility section when showSpacesIntegration is true', () => {
      renderComponent();

      expect(screen.getByTestId('aiFeatureVisibilitySection')).toBeInTheDocument();
      expect(screen.getByTestId('goToSpacesButton')).toBeInTheDocument();
    });

    it('should not render ai feature visibility section when showSpacesIntegration is false', () => {
      mockUseEnabledFeatures.mockReturnValue({
        showSpacesIntegration: false,
        isPermissionsBased: false,
        showAiBreadcrumb: true,
      });

      renderComponent();

      expect(screen.queryByTestId('aiFeatureVisibilitySection')).not.toBeInTheDocument();
      expect(screen.queryByTestId('goToSpacesButton')).not.toBeInTheDocument();
    });
  });

  describe('permissions-based view', () => {
    it('should handle permissions-based view correctly', () => {
      mockUseEnabledFeatures.mockReturnValue({
        showSpacesIntegration: true,
        isPermissionsBased: true,
        showAiBreadcrumb: true,
      });

      renderComponent();

      expect(screen.getByTestId('goToPermissionsTabButton')).toBeInTheDocument();
    });
  });
});
