/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { UseFormReturn } from 'react-hook-form';
import { FormProvider, useForm } from 'react-hook-form';
import { QueryClientProvider } from '@kbn/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { DASHBOARD_ARTIFACT_TYPE, RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import { RuleFormProvider, type RuleFormServices } from '../../../form/contexts';
import { createMockServices, createTestQueryClient } from '../../../test_utils';
import { createInitialState } from '../use_compose_discover_state';
import type { ComposeDiscoverState } from '../types';
import type { ComposeFormValues } from '../compose_form_types';
import { ComposeDiscoverForm, getSteps } from '.';

const createState = (overrides: Partial<ComposeDiscoverState> = {}): ComposeDiscoverState => ({
  ...createInitialState({ mode: 'create' }),
  ...overrides,
});

const BASE_COMPOSE_VALUES: ComposeFormValues = {
  kind: 'signal',
  metadata: { name: 'Test rule', enabled: true },
  timeField: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { format: 'standalone', breach: '' },
  stateTransitionAlertDelayMode: 'immediate',
  stateTransitionRecoveryDelayMode: 'immediate',
  artifacts: [],
  runbookArtifacts: [],
  dashboardArtifacts: [],
};

interface Dashboard {
  id: string;
  title: string;
}

interface GetDashboardsByIdContext {
  ids: string[];
  onResults: (dashboards: Dashboard[]) => void;
}

const DASHBOARD_ID = 'dashboard-123';
const DASHBOARD_TITLE = 'Dashboard 123';

const mockGetByIdExecute = jest.fn((context: GetDashboardsByIdContext) => {
  context.onResults(
    context.ids
      .map((id) => (id === DASHBOARD_ID ? { id: DASHBOARD_ID, title: DASHBOARD_TITLE } : null))
      .filter((dashboard): dashboard is Dashboard => Boolean(dashboard))
  );
});

const mockUiActions = {
  getAction: jest.fn((actionId: string) => {
    if (actionId === 'getDashboardsByIdsAction') {
      return Promise.resolve({ execute: mockGetByIdExecute });
    }

    return Promise.resolve({ execute: jest.fn() });
  }),
} as unknown as UiActionsStart;

const createComposeFormWrapper = (
  defaultValues: ComposeFormValues = BASE_COMPOSE_VALUES,
  services: RuleFormServices = { ...createMockServices(), uiActions: mockUiActions }
) => {
  const queryClient = createTestQueryClient();

  return ({ children }: { children: React.ReactNode }) => {
    const form = useForm<ComposeFormValues>({ defaultValues });

    return (
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <FormProvider {...form}>
            <RuleFormProvider services={services} meta={{ layout: 'flyout' }}>
              {children}
            </RuleFormProvider>
          </FormProvider>
        </QueryClientProvider>
      </IntlProvider>
    );
  };
};

const renderComposeDiscoverDetailsStep = (defaultValues: ComposeFormValues = BASE_COMPOSE_VALUES) =>
  render(
    <ComposeDiscoverForm
      state={createState({ step: 1 })}
      dispatch={jest.fn()}
      services={{ ...createMockServices(), uiActions: mockUiActions }}
      onRecoveryTypeChange={jest.fn()}
      onKindChange={jest.fn()}
    />,
    { wrapper: createComposeFormWrapper(defaultValues) }
  );

describe('step validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('alertCondition.validate', () => {
    const alertStep = getSteps(false).find((s) => s.id === 'alertCondition')!;

    it('returns true when queryCommitted is true', async () => {
      const state = createState({ queryCommitted: true });
      const methods = {} as UseFormReturn<ComposeFormValues>;

      expect(await alertStep.validate!(methods, state)).toBe(true);
    });

    it('returns false when queryCommitted is false', async () => {
      const state = createState({ queryCommitted: false });
      const methods = {} as UseFormReturn<ComposeFormValues>;

      expect(await alertStep.validate!(methods, state)).toBe(false);
    });
  });

  describe('details.validate', () => {
    const detailsStep = getSteps(false).find((s) => s.id === 'details')!;

    it('delegates to methods.trigger with metadata.name', async () => {
      const state = createState();
      const methods = {
        trigger: jest.fn().mockResolvedValue(true),
      } as unknown as UseFormReturn<ComposeFormValues>;

      const result = await detailsStep.validate!(methods, state);

      expect(methods.trigger).toHaveBeenCalledWith(['metadata.name']);
      expect(result).toBe(true);
    });

    it('returns false when trigger rejects validation', async () => {
      const state = createState();
      const methods = {
        trigger: jest.fn().mockResolvedValue(false),
      } as unknown as UseFormReturn<ComposeFormValues>;

      const result = await detailsStep.validate!(methods, state);

      expect(result).toBe(false);
    });
  });

  describe('details.render', () => {
    it('renders runbook and related dashboard artifact fields', () => {
      renderComposeDiscoverDetailsStep();

      expect(screen.getByText('Artifacts')).toBeTruthy();
      expect(screen.getByText('Runbook')).toBeTruthy();
      expect(screen.getByTestId('addRunbookButton')).toBeTruthy();
      expect(screen.getByText('Related dashboards')).toBeTruthy();
      expect(screen.getByPlaceholderText('Link related dashboards for investigation')).toBeTruthy();
    });

    it('renders existing runbook and related dashboard artifacts', async () => {
      renderComposeDiscoverDetailsStep({
        ...BASE_COMPOSE_VALUES,
        runbookArtifacts: [
          {
            id: 'runbook-id',
            type: RUNBOOK_ARTIFACT_TYPE,
            value: 'Investigate failed transactions\nCheck service logs',
          },
        ],
        dashboardArtifacts: [
          { id: 'dashboard-id', type: DASHBOARD_ARTIFACT_TYPE, value: DASHBOARD_ID },
        ],
      });

      expect(screen.getByText('Investigate failed transactions')).toBeTruthy();
      expect(screen.getByLabelText('Edit Runbook')).toBeTruthy();
      expect(screen.getByLabelText('Delete Runbook')).toBeTruthy();

      await waitFor(() => {
        expect(screen.getByText(DASHBOARD_TITLE)).toBeTruthy();
      });
      expect(mockUiActions.getAction).toHaveBeenCalledWith('getDashboardsByIdsAction');
    });
  });

  describe('step registry', () => {
    it('recoveryCondition has no validate function', () => {
      const recoveryStep = getSteps(true).find((s) => s.id === 'recoveryCondition')!;
      expect(recoveryStep.validate).toBeUndefined();
    });

    it('does not include the placeholder notifications step', () => {
      expect(getSteps(false).map((step) => step.id)).toEqual(['alertCondition', 'details']);
      expect(getSteps(true).map((step) => step.id)).toEqual([
        'alertCondition',
        'recoveryCondition',
        'details',
      ]);
    });
  });
});
