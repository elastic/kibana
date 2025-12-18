/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, waitFor, act } from '@testing-library/react';
import type { PolicyFromES } from '@kbn/index-lifecycle-management-common-shared';
import type { TemplateListItem as IndexTemplate } from '@kbn/index-management-shared-types';

import { ConfirmTemplateDetailsSection } from './confirm_template_details_section';
import type { IlmPolicyFetcher } from '../../../../utils';

const createMockTemplate = (overrides: Partial<IndexTemplate> = {}): IndexTemplate => ({
  name: 'test-template',
  indexPatterns: ['test-*'],
  allowAutoCreate: 'NO_OVERWRITE',
  _kbnMeta: { type: 'default', hasDatastream: true },
  hasSettings: false,
  hasAliases: false,
  hasMappings: false,
  ...overrides,
});

const createMockIlmPolicy = (phases: PolicyFromES['policy']['phases'] = {}): PolicyFromES => ({
  name: 'test-policy',
  version: 1,
  modifiedDate: '2024-01-01T00:00:00.000Z',
  policy: {
    phases,
    name: 'test-policy',
  },
});

const renderComponent = (
  template: IndexTemplate,
  getIlmPolicy?: IlmPolicyFetcher,
  showDataRetention = true
) => {
  return render(
    <IntlProvider>
      <ConfirmTemplateDetailsSection
        template={template}
        getIlmPolicy={getIlmPolicy}
        showDataRetention={showDataRetention}
      />
    </IntlProvider>
  );
};

describe('ConfirmTemplateDetailsSection', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('rendering', () => {
    it('renders the section title', () => {
      const template = createMockTemplate();
      const { getByText, getByTestId } = renderComponent(template);

      expect(getByText('Confirm index template details')).toBeInTheDocument();
      expect(getByTestId('templateDetails')).toBeInTheDocument();
    });

    it('renders template details in a description list', () => {
      const template = createMockTemplate();
      const { getByTestId } = renderComponent(template);

      const descriptionList = getByTestId('templateDetails');
      expect(descriptionList).toBeInTheDocument();
    });
  });

  describe('version display', () => {
    it('displays version when present', () => {
      const template = createMockTemplate({ version: 5 });
      const { getByText } = renderComponent(template);

      expect(getByText('Version')).toBeInTheDocument();
      expect(getByText('5')).toBeInTheDocument();
    });

    it('displays version 0 when version is 0', () => {
      const template = createMockTemplate({ version: 0 });
      const { getByText } = renderComponent(template);

      expect(getByText('Version')).toBeInTheDocument();
      expect(getByText('0')).toBeInTheDocument();
    });

    it('does not display version when not present', () => {
      const template = createMockTemplate({ version: undefined });
      const { queryByText } = renderComponent(template);

      expect(queryByText('Version')).not.toBeInTheDocument();
    });
  });

  describe('index mode display', () => {
    it('displays Standard index mode by default', () => {
      const template = createMockTemplate();
      const { getByText } = renderComponent(template);

      expect(getByText('Index mode')).toBeInTheDocument();
      expect(getByText('Standard')).toBeInTheDocument();
    });

    it('displays Standard index mode when explicitly set', () => {
      const template = createMockTemplate({ indexMode: 'standard' });
      const { getByText } = renderComponent(template);

      expect(getByText('Standard')).toBeInTheDocument();
    });

    it('displays LogsDB index mode', () => {
      const template = createMockTemplate({ indexMode: 'logsdb' });
      const { getByText } = renderComponent(template);

      expect(getByText('LogsDB')).toBeInTheDocument();
    });

    it('displays Lookup index mode', () => {
      const template = createMockTemplate({ indexMode: 'lookup' });
      const { getByText } = renderComponent(template);

      expect(getByText('Lookup')).toBeInTheDocument();
    });

    it('displays Time series index mode', () => {
      const template = createMockTemplate({ indexMode: 'time_series' });
      const { getByText } = renderComponent(template);

      expect(getByText('Time series')).toBeInTheDocument();
    });
  });

  describe('retention display', () => {
    describe('ILM policy retention', () => {
      it('displays ILM policy name with badge', () => {
        const template = createMockTemplate({ ilmPolicy: { name: 'my-ilm-policy' } });
        const { getByText } = renderComponent(template);

        expect(getByText('Retention')).toBeInTheDocument();
        expect(getByText('my-ilm-policy')).toBeInTheDocument();
        expect(getByText('ILM')).toBeInTheDocument();
      });

      it('does not display retention when no ILM policy or lifecycle', () => {
        const template = createMockTemplate({
          ilmPolicy: undefined,
          lifecycle: undefined,
        });
        const { queryByText } = renderComponent(template);

        expect(queryByText('Retention')).not.toBeInTheDocument();
      });
    });

    describe('data retention (lifecycle)', () => {
      it('displays data retention when lifecycle is present', () => {
        const template = createMockTemplate({
          lifecycle: { enabled: true, value: 30, unit: 'd' },
        });
        const { getByText } = renderComponent(template);

        expect(getByText('Retention')).toBeInTheDocument();
        expect(getByText('30d')).toBeInTheDocument();
      });

      it('displays data retention with different units', () => {
        const template = createMockTemplate({
          lifecycle: { enabled: true, value: 2, unit: 'h' },
        });
        const { getByText } = renderComponent(template);

        expect(getByText('2h')).toBeInTheDocument();
      });

      it('prefers ILM policy over lifecycle when both present', () => {
        const template = createMockTemplate({
          ilmPolicy: { name: 'my-policy' },
          lifecycle: { enabled: true, value: 30, unit: 'd' },
        });
        const { getByText, queryByText } = renderComponent(template);

        expect(getByText('my-policy')).toBeInTheDocument();
        expect(getByText('ILM')).toBeInTheDocument();
        expect(queryByText('30 days')).not.toBeInTheDocument();
      });
    });
  });

  describe('component templates display', () => {
    it('displays component templates when present', () => {
      const template = createMockTemplate({
        composedOf: ['logs@mappings', 'logs@settings'],
      });
      const { getByText } = renderComponent(template);

      expect(getByText('Component templates')).toBeInTheDocument();
      expect(getByText('logs@mappings')).toBeInTheDocument();
      expect(getByText('logs@settings')).toBeInTheDocument();
    });

    it('displays single component template', () => {
      const template = createMockTemplate({
        composedOf: ['single-component'],
      });
      const { getByText } = renderComponent(template);

      expect(getByText('Component templates')).toBeInTheDocument();
      expect(getByText('single-component')).toBeInTheDocument();
    });

    it('does not display component templates section when empty', () => {
      const template = createMockTemplate({ composedOf: [] });
      const { queryByText } = renderComponent(template);

      expect(queryByText('Component templates')).not.toBeInTheDocument();
    });

    it('does not display component templates section when undefined', () => {
      const template = createMockTemplate({ composedOf: undefined });
      const { queryByText } = renderComponent(template);

      expect(queryByText('Component templates')).not.toBeInTheDocument();
    });
  });

  describe('ILM policy fetching', () => {
    it('fetches ILM policy when template has ILM policy and getIlmPolicy is provided', async () => {
      const mockGetIlmPolicy = jest.fn().mockResolvedValue(
        createMockIlmPolicy({
          hot: { actions: {} },
          warm: { min_age: '7d', actions: {} },
        })
      );

      const template = createMockTemplate({ ilmPolicy: { name: 'test-policy' } });
      const { findByText, container } = renderComponent(template, mockGetIlmPolicy);

      // Wait for fetch to complete (loading spinner disappears and phases are rendered)
      await waitFor(() => {
        expect(mockGetIlmPolicy).toHaveBeenCalledWith('test-policy', expect.any(AbortSignal));
        expect(container.querySelector('.euiLoadingSpinner')).not.toBeInTheDocument();
      });
      await findByText(/Hot/i);
    });

    it('does not fetch ILM policy when template has no ILM policy', () => {
      const mockGetIlmPolicy = jest.fn();

      const template = createMockTemplate({ ilmPolicy: undefined });
      renderComponent(template, mockGetIlmPolicy);

      expect(mockGetIlmPolicy).not.toHaveBeenCalled();
    });

    it('does not fetch ILM policy when getIlmPolicy is not provided', () => {
      const template = createMockTemplate({ ilmPolicy: { name: 'test-policy' } });
      // Render without getIlmPolicy - should not throw
      const { getByText } = renderComponent(template);

      expect(getByText('test-policy')).toBeInTheDocument();
    });

    describe('loading state', () => {
      it('shows loading spinner while fetching ILM policy', async () => {
        const mockGetIlmPolicy = jest.fn().mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(() => resolve(createMockIlmPolicy({ hot: { actions: {} } })), 1000);
          });
        });

        const template = createMockTemplate({ ilmPolicy: { name: 'test-policy' } });
        const { container, unmount } = renderComponent(template, mockGetIlmPolicy);

        await waitFor(() => {
          expect(mockGetIlmPolicy).toHaveBeenCalled();
        });

        // Loading spinner should be visible
        const spinner = container.querySelector('.euiLoadingSpinner');
        expect(spinner).toBeInTheDocument();

        unmount();
      });

      it('hides loading spinner after fetching completes', async () => {
        const mockGetIlmPolicy = jest
          .fn()
          .mockResolvedValue(createMockIlmPolicy({ hot: { actions: {} } }));

        const template = createMockTemplate({ ilmPolicy: { name: 'test-policy' } });
        const { container, findByText } = renderComponent(template, mockGetIlmPolicy);

        // Wait for phases to be displayed
        await findByText(/Hot/i);

        // Loading spinner should not be visible
        const spinner = container.querySelector('.euiLoadingSpinner');
        expect(spinner).not.toBeInTheDocument();
      });
    });

    describe('phase display', () => {
      it('displays ILM phases after successful fetch', async () => {
        const mockGetIlmPolicy = jest.fn().mockResolvedValue(
          createMockIlmPolicy({
            hot: { actions: {} },
            warm: { min_age: '7d', actions: {} },
            cold: { min_age: '30d', actions: {} },
          })
        );

        const template = createMockTemplate({ ilmPolicy: { name: 'test-policy' } });
        const { findByText } = renderComponent(template, mockGetIlmPolicy);

        await findByText(/Hot until 7d/i);
        await findByText(/Warm until 30d/i);
        await findByText(/Cold indefinitely/i);
      });

      it('displays single phase correctly', async () => {
        const mockGetIlmPolicy = jest.fn().mockResolvedValue(
          createMockIlmPolicy({
            hot: { actions: {} },
          })
        );

        const template = createMockTemplate({ ilmPolicy: { name: 'test-policy' } });
        const { findByText } = renderComponent(template, mockGetIlmPolicy);

        await findByText(/Hot indefinitely/i);
      });

      it('does not display phases when policy has no phases', async () => {
        const mockGetIlmPolicy = jest.fn().mockResolvedValue(createMockIlmPolicy({}));

        const template = createMockTemplate({ ilmPolicy: { name: 'test-policy' } });
        const { queryByText, container } = renderComponent(template, mockGetIlmPolicy);

        // Wait for loading to complete (spinner disappears)
        await waitFor(() => {
          expect(mockGetIlmPolicy).toHaveBeenCalled();
          expect(container.querySelector('.euiLoadingSpinner')).not.toBeInTheDocument();
        });

        expect(queryByText(/Hot/i)).not.toBeInTheDocument();
        expect(queryByText(/Warm/i)).not.toBeInTheDocument();
        expect(queryByText(/Cold/i)).not.toBeInTheDocument();
      });
    });

    describe('error handling', () => {
      it('shows error message when ILM policy fetch fails', async () => {
        const mockGetIlmPolicy = jest.fn().mockRejectedValue(new Error('Network error'));

        const template = createMockTemplate({ ilmPolicy: { name: 'test-policy' } });
        const { findByText } = renderComponent(template, mockGetIlmPolicy);

        await findByText(/There was an error while loading the ILM policy phases/i);
      });

      it('does not crash and displays policy name on error', async () => {
        const mockGetIlmPolicy = jest.fn().mockRejectedValue(new Error('Network error'));

        const template = createMockTemplate({ ilmPolicy: { name: 'test-policy' } });
        const { findByText, getByText } = renderComponent(template, mockGetIlmPolicy);

        await findByText(/There was an error while loading the ILM policy phases/i);

        // Policy name should still be visible
        expect(getByText('test-policy')).toBeInTheDocument();
        expect(getByText('ILM')).toBeInTheDocument();
      });
    });

    describe('AbortController handling', () => {
      it('passes abort signal to getIlmPolicy', async () => {
        let capturedSignal: AbortSignal | undefined;
        const mockGetIlmPolicy = jest.fn().mockImplementation((policyName, signal) => {
          capturedSignal = signal;
          return new Promise((resolve) => {
            setTimeout(() => resolve(createMockIlmPolicy({ hot: { actions: {} } })), 1000);
          });
        });

        const template = createMockTemplate({ ilmPolicy: { name: 'test-policy' } });
        const { unmount } = renderComponent(template, mockGetIlmPolicy);

        await waitFor(() => {
          expect(mockGetIlmPolicy).toHaveBeenCalled();
          expect(capturedSignal).toBeDefined();
          expect(capturedSignal).toBeInstanceOf(AbortSignal);
        });

        unmount();
      });

      it('aborts ILM policy fetch on unmount', async () => {
        let capturedSignal: AbortSignal | undefined;
        const mockGetIlmPolicy = jest.fn().mockImplementation((policyName, signal) => {
          capturedSignal = signal;
          return new Promise((resolve) => {
            setTimeout(() => resolve(createMockIlmPolicy({ hot: { actions: {} } })), 10000);
          });
        });

        const template = createMockTemplate({ ilmPolicy: { name: 'test-policy' } });
        const { unmount } = renderComponent(template, mockGetIlmPolicy);

        await waitFor(() => {
          expect(mockGetIlmPolicy).toHaveBeenCalled();
          expect(capturedSignal).toBeDefined();
        });

        unmount();

        expect(capturedSignal?.aborted).toBe(true);
      });
    });

    describe('policy changes', () => {
      it('fetches new policy when template changes', async () => {
        const mockGetIlmPolicy = jest
          .fn()
          .mockResolvedValue(createMockIlmPolicy({ hot: { actions: {} } }));

        const template1 = createMockTemplate({ ilmPolicy: { name: 'policy-1' } });
        const { rerender, container, findByText } = renderComponent(template1, mockGetIlmPolicy);

        // Wait for first fetch to complete (loading spinner disappears)
        await waitFor(() => {
          expect(mockGetIlmPolicy).toHaveBeenCalledWith('policy-1', expect.any(AbortSignal));
          expect(container.querySelector('.euiLoadingSpinner')).not.toBeInTheDocument();
        });

        mockGetIlmPolicy.mockClear();

        // Change to a different template - wrap in act to handle synchronous state update
        await act(async () => {
          const template2 = createMockTemplate({ ilmPolicy: { name: 'policy-2' } });
          rerender(
            <IntlProvider>
              <ConfirmTemplateDetailsSection template={template2} getIlmPolicy={mockGetIlmPolicy} />
            </IntlProvider>
          );
        });

        // Wait for second fetch to complete
        await waitFor(() => {
          expect(mockGetIlmPolicy).toHaveBeenCalledWith('policy-2', expect.any(AbortSignal));
          expect(container.querySelector('.euiLoadingSpinner')).not.toBeInTheDocument();
        });
        await findByText(/Hot/i);
      });

      it('aborts previous fetch when policy name changes', async () => {
        let firstSignal: AbortSignal | undefined;
        let secondSignal: AbortSignal | undefined;
        let callCount = 0;

        const mockGetIlmPolicy = jest.fn().mockImplementation((policyName, signal) => {
          callCount++;
          if (callCount === 1) {
            firstSignal = signal;
          } else {
            secondSignal = signal;
          }
          return new Promise((resolve) => {
            setTimeout(() => resolve(createMockIlmPolicy({ hot: { actions: {} } })), 10000);
          });
        });

        const template1 = createMockTemplate({ ilmPolicy: { name: 'policy-1' } });
        const { rerender, unmount } = renderComponent(template1, mockGetIlmPolicy);

        await waitFor(() => {
          expect(mockGetIlmPolicy).toHaveBeenCalledTimes(1);
          expect(firstSignal).toBeDefined();
        });

        // Change to a different template
        const template2 = createMockTemplate({ ilmPolicy: { name: 'policy-2' } });
        rerender(
          <IntlProvider>
            <ConfirmTemplateDetailsSection template={template2} getIlmPolicy={mockGetIlmPolicy} />
          </IntlProvider>
        );

        await waitFor(() => {
          expect(mockGetIlmPolicy).toHaveBeenCalledTimes(2);
          expect(firstSignal?.aborted).toBe(true);
          expect(secondSignal).toBeDefined();
          expect(secondSignal?.aborted).toBe(false);
        });

        unmount();
      });

      it('clears policy data when template changes to one without ILM', async () => {
        const mockGetIlmPolicy = jest.fn().mockResolvedValue(
          createMockIlmPolicy({
            hot: { actions: {} },
            warm: { min_age: '7d', actions: {} },
          })
        );

        const template1 = createMockTemplate({ ilmPolicy: { name: 'test-policy' } });
        const { rerender, findByText, queryByText } = renderComponent(template1, mockGetIlmPolicy);

        // Wait for phases to be displayed
        await findByText(/Hot until 7d/i);

        // Change to template without ILM
        const template2 = createMockTemplate({
          ilmPolicy: undefined,
          lifecycle: { enabled: true, value: 30, unit: 'd' },
        });
        rerender(
          <IntlProvider>
            <ConfirmTemplateDetailsSection template={template2} getIlmPolicy={mockGetIlmPolicy} />
          </IntlProvider>
        );

        await waitFor(() => {
          expect(queryByText(/Hot/i)).not.toBeInTheDocument();
          expect(queryByText('ILM')).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('showDataRetention prop', () => {
    it('hides ILM policy retention when showDataRetention is false', () => {
      const template = createMockTemplate({ ilmPolicy: { name: 'my-ilm-policy' } });
      const { queryByText } = renderComponent(template, undefined, false);

      expect(queryByText('Retention')).not.toBeInTheDocument();
      expect(queryByText('my-ilm-policy')).not.toBeInTheDocument();
      expect(queryByText('ILM')).not.toBeInTheDocument();
    });

    it('hides lifecycle data retention when showDataRetention is false', () => {
      const template = createMockTemplate({
        lifecycle: { enabled: true, value: 30, unit: 'd' },
      });
      const { queryByText } = renderComponent(template, undefined, false);

      expect(queryByText('Retention')).not.toBeInTheDocument();
      expect(queryByText('30d')).not.toBeInTheDocument();
    });

    it('does not call getIlmPolicy when showDataRetention is false', () => {
      const mockGetIlmPolicy = jest.fn().mockResolvedValue(createMockIlmPolicy({}));
      const template = createMockTemplate({ ilmPolicy: { name: 'test-policy' } });
      renderComponent(template, mockGetIlmPolicy, false);

      expect(mockGetIlmPolicy).not.toHaveBeenCalled();
    });

    it('still displays other template details when showDataRetention is false', () => {
      const template = createMockTemplate({
        version: 5,
        indexMode: 'logsdb',
        ilmPolicy: { name: 'hidden-policy' },
        composedOf: ['component-1', 'component-2'],
      });
      const { getByText, queryByText } = renderComponent(template, undefined, false);

      // Version should be visible
      expect(getByText('Version')).toBeInTheDocument();
      expect(getByText('5')).toBeInTheDocument();

      // Index mode should be visible
      expect(getByText('Index mode')).toBeInTheDocument();
      expect(getByText('LogsDB')).toBeInTheDocument();

      // Component templates should be visible
      expect(getByText('Component templates')).toBeInTheDocument();
      expect(getByText('component-1')).toBeInTheDocument();
      expect(getByText('component-2')).toBeInTheDocument();

      // Retention should be hidden
      expect(queryByText('Retention')).not.toBeInTheDocument();
      expect(queryByText('hidden-policy')).not.toBeInTheDocument();
    });

    it('shows retention when showDataRetention is true (default)', () => {
      const template = createMockTemplate({ ilmPolicy: { name: 'visible-policy' } });
      const { getByText } = renderComponent(template, undefined, true);

      expect(getByText('Retention')).toBeInTheDocument();
      expect(getByText('visible-policy')).toBeInTheDocument();
      expect(getByText('ILM')).toBeInTheDocument();
    });

    it('calls getIlmPolicy when showDataRetention is true', async () => {
      const mockGetIlmPolicy = jest.fn().mockResolvedValue(
        createMockIlmPolicy({
          hot: { actions: {} },
        })
      );
      const template = createMockTemplate({ ilmPolicy: { name: 'test-policy' } });
      const { findByText } = renderComponent(template, mockGetIlmPolicy, true);

      await waitFor(() => {
        expect(mockGetIlmPolicy).toHaveBeenCalledWith('test-policy', expect.any(AbortSignal));
      });
      await findByText(/Hot/i);
    });
  });

  describe('combined template details', () => {
    it('displays all template details together', async () => {
      const mockGetIlmPolicy = jest.fn().mockResolvedValue(
        createMockIlmPolicy({
          hot: { actions: {} },
          warm: { min_age: '7d', actions: {} },
        })
      );

      const template = createMockTemplate({
        version: 3,
        indexMode: 'logsdb',
        ilmPolicy: { name: 'comprehensive-policy' },
        composedOf: ['component-a', 'component-b', 'component-c'],
      });

      const { getByText, findByText } = renderComponent(template, mockGetIlmPolicy);

      // Version
      expect(getByText('Version')).toBeInTheDocument();
      expect(getByText('3')).toBeInTheDocument();

      // Index mode
      expect(getByText('Index mode')).toBeInTheDocument();
      expect(getByText('LogsDB')).toBeInTheDocument();

      // Retention
      expect(getByText('Retention')).toBeInTheDocument();
      expect(getByText('comprehensive-policy')).toBeInTheDocument();
      expect(getByText('ILM')).toBeInTheDocument();

      // Phases
      await findByText(/Hot until 7d/i);
      await findByText(/Warm indefinitely/i);

      // Component templates
      expect(getByText('Component templates')).toBeInTheDocument();
      expect(getByText('component-a')).toBeInTheDocument();
      expect(getByText('component-b')).toBeInTheDocument();
      expect(getByText('component-c')).toBeInTheDocument();
    });

    it('displays minimal template details correctly', () => {
      const template = createMockTemplate({
        version: undefined,
        indexMode: undefined,
        ilmPolicy: undefined,
        lifecycle: undefined,
        composedOf: undefined,
      });

      const { getByText, queryByText } = renderComponent(template);

      // Only index mode should be present (defaults to Standard)
      expect(getByText('Index mode')).toBeInTheDocument();
      expect(getByText('Standard')).toBeInTheDocument();

      // These should not be present
      expect(queryByText('Version')).not.toBeInTheDocument();
      expect(queryByText('Retention')).not.toBeInTheDocument();
      expect(queryByText('Component templates')).not.toBeInTheDocument();
    });
  });
});
