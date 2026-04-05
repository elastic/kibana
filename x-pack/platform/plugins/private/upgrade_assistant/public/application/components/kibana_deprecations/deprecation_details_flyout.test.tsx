/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { I18nProvider } from '@kbn/i18n-react';

import type { KibanaDeprecationDetails } from './kibana_deprecations';
import type { DeprecationResolutionState } from './kibana_deprecations';
import { DeprecationDetailsFlyout } from './deprecation_details_flyout';

const renderWithProviders = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

const createFeatureDeprecation = (
  overrides: Partial<
    Omit<KibanaDeprecationDetails, 'deprecationType' | 'configPath' | 'filterType'>
  > = {}
): KibanaDeprecationDetails => ({
  id: 'test-id',
  domainId: 'test_domain',
  level: 'warning',
  title: 'Test deprecation title',
  message: 'Test deprecation message',
  correctiveActions: { manualSteps: [] },
  ...overrides,
  deprecationType: 'feature',
  filterType: 'feature',
});

const mockCloseFlyout = jest.fn();
const mockResolveDeprecation = jest.fn().mockResolvedValue(undefined);

describe('DeprecationDetailsFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WHEN deprecation has a single manual step', () => {
    it('SHOULD render the step as a standalone paragraph', () => {
      const deprecation = createFeatureDeprecation({
        id: 'dep-1',
        level: 'critical',
        title: 'Critical deprecation',
        correctiveActions: {
          manualSteps: ['Step 1'],
          api: { method: 'POST' as const, path: '/test' },
        },
      });

      renderWithProviders(
        <DeprecationDetailsFlyout
          deprecation={deprecation}
          closeFlyout={mockCloseFlyout}
          resolveDeprecation={mockResolveDeprecation}
        />
      );

      expect(screen.getByTestId('flyoutTitle')).toHaveTextContent(deprecation.title);
      expect(screen.getAllByTestId('manualStep')).toHaveLength(1);
    });
  });

  describe('WHEN deprecation has multiple manual steps', () => {
    it('SHOULD render steps as a list', () => {
      const deprecation = createFeatureDeprecation({
        id: 'dep-2',
        title: 'Multi-step deprecation',
        correctiveActions: {
          manualSteps: ['Step 1', 'Step 2', 'Step 3'],
        },
      });

      renderWithProviders(
        <DeprecationDetailsFlyout
          deprecation={deprecation}
          closeFlyout={mockCloseFlyout}
          resolveDeprecation={mockResolveDeprecation}
        />
      );

      expect(screen.getByTestId('flyoutTitle')).toHaveTextContent(deprecation.title);
      expect(screen.getAllByTestId('manualStepsListItem')).toHaveLength(3);
    });
  });

  describe('WHEN deprecation has no manual steps', () => {
    it('SHOULD not show corrective actions title and steps', () => {
      const deprecation = createFeatureDeprecation({
        id: 'dep-3',
        title: 'No-steps deprecation',
        correctiveActions: {
          manualSteps: [],
        },
      });

      renderWithProviders(
        <DeprecationDetailsFlyout
          deprecation={deprecation}
          closeFlyout={mockCloseFlyout}
          resolveDeprecation={mockResolveDeprecation}
        />
      );

      expect(screen.getByTestId('flyoutTitle')).toHaveTextContent(deprecation.title);
      expect(screen.queryByTestId('manualStepsTitle')).not.toBeInTheDocument();
      expect(screen.queryByTestId('manualStepsListItem')).not.toBeInTheDocument();
    });
  });

  describe('WHEN deprecation has a documentation URL', () => {
    it('SHOULD render the documentation link', () => {
      const deprecation = createFeatureDeprecation({
        id: 'dep-doc',
        documentationUrl: 'https://example.com/docs',
        correctiveActions: { manualSteps: ['Step 1', 'Step 2'] },
      });

      renderWithProviders(
        <DeprecationDetailsFlyout
          deprecation={deprecation}
          closeFlyout={mockCloseFlyout}
          resolveDeprecation={mockResolveDeprecation}
        />
      );

      const docLink = screen.getByTestId('documentationLink') as HTMLAnchorElement;
      expect(docLink.getAttribute('href')).toBe('https://example.com/docs');
    });
  });

  describe('WHEN deprecation supports automatic resolution', () => {
    it('SHOULD show quick resolve callout and button', () => {
      const deprecation = createFeatureDeprecation({
        id: 'dep-auto',
        level: 'critical',
        correctiveActions: {
          manualSteps: ['Step 1'],
          api: { method: 'POST' as const, path: '/test' },
        },
      });

      renderWithProviders(
        <DeprecationDetailsFlyout
          deprecation={deprecation}
          closeFlyout={mockCloseFlyout}
          resolveDeprecation={mockResolveDeprecation}
        />
      );

      expect(screen.getByTestId('criticalDeprecationBadge')).toBeInTheDocument();
      expect(screen.getByTestId('quickResolveCallout')).toBeInTheDocument();
      expect(screen.getByTestId('resolveButton')).toBeInTheDocument();
    });

    it('SHOULD show loading/disabled resolve button when resolution is in progress', () => {
      const deprecation = createFeatureDeprecation({
        id: 'dep-in-progress',
        level: 'critical',
        correctiveActions: {
          manualSteps: ['Step 1'],
          api: { method: 'POST' as const, path: '/test' },
        },
      });

      const resolutionState: DeprecationResolutionState = {
        id: 'dep-in-progress',
        resolveDeprecationStatus: 'in_progress',
      };

      renderWithProviders(
        <DeprecationDetailsFlyout
          deprecation={deprecation}
          closeFlyout={mockCloseFlyout}
          resolveDeprecation={mockResolveDeprecation}
          deprecationResolutionState={resolutionState}
        />
      );

      expect(screen.getByTestId('resolveButton')).toBeDisabled();
      expect(screen.getByTestId('resolveButton')).toHaveTextContent('Resolution in progress');
    });

    it('SHOULD call resolveDeprecation when resolve button is clicked', () => {
      const deprecation = createFeatureDeprecation({
        id: 'dep-resolve',
        level: 'critical',
        correctiveActions: {
          manualSteps: ['Step 1'],
          api: { method: 'POST' as const, path: '/test' },
        },
      });

      renderWithProviders(
        <DeprecationDetailsFlyout
          deprecation={deprecation}
          closeFlyout={mockCloseFlyout}
          resolveDeprecation={mockResolveDeprecation}
        />
      );

      fireEvent.click(screen.getByTestId('resolveButton'));
      expect(mockResolveDeprecation).toHaveBeenCalledTimes(1);
      expect(mockResolveDeprecation).toHaveBeenCalledWith(deprecation);
    });

    it('SHOULD show resolved badge and hide resolve controls after successful resolution', () => {
      const deprecation = createFeatureDeprecation({
        id: 'dep-resolved',
        level: 'critical',
        correctiveActions: {
          manualSteps: ['Step 1'],
          api: { method: 'POST' as const, path: '/test' },
        },
      });

      const resolutionState: DeprecationResolutionState = {
        id: 'dep-resolved',
        resolveDeprecationStatus: 'ok',
      };

      renderWithProviders(
        <DeprecationDetailsFlyout
          deprecation={deprecation}
          closeFlyout={mockCloseFlyout}
          resolveDeprecation={mockResolveDeprecation}
          deprecationResolutionState={resolutionState}
        />
      );

      expect(screen.queryByTestId('resolveSection')).not.toBeInTheDocument();
      expect(screen.queryByTestId('resolveButton')).not.toBeInTheDocument();
      expect(screen.getByTestId('resolvedDeprecationBadge')).toBeInTheDocument();
    });

    it('SHOULD show error and retry button after failed resolution', () => {
      const deprecation = createFeatureDeprecation({
        id: 'dep-failed',
        level: 'critical',
        correctiveActions: {
          manualSteps: ['Step 1'],
          api: { method: 'POST' as const, path: '/test' },
        },
      });

      const resolutionState: DeprecationResolutionState = {
        id: 'dep-failed',
        resolveDeprecationStatus: 'fail',
        resolveDeprecationError: 'resolve failed',
      };

      renderWithProviders(
        <DeprecationDetailsFlyout
          deprecation={deprecation}
          closeFlyout={mockCloseFlyout}
          resolveDeprecation={mockResolveDeprecation}
          deprecationResolutionState={resolutionState}
        />
      );

      expect(screen.getByTestId('quickResolveError')).toBeInTheDocument();
      expect(screen.getByTestId('resolveSection')).toBeInTheDocument();
      expect(screen.getByTestId('criticalDeprecationBadge')).toBeInTheDocument();
      expect(screen.getByTestId('resolveButton')).toBeEnabled();
      expect(screen.getByTestId('resolveButton')).toHaveTextContent('Try again');
    });
  });

  describe('WHEN deprecation does not support automatic resolution', () => {
    it('SHOULD not show resolve button', () => {
      const deprecation = createFeatureDeprecation({
        id: 'dep-manual',
        correctiveActions: {
          manualSteps: ['Step 1'],
        },
      });

      renderWithProviders(
        <DeprecationDetailsFlyout
          deprecation={deprecation}
          closeFlyout={mockCloseFlyout}
          resolveDeprecation={mockResolveDeprecation}
        />
      );

      expect(screen.queryByTestId('resolveButton')).not.toBeInTheDocument();
    });
  });
});
