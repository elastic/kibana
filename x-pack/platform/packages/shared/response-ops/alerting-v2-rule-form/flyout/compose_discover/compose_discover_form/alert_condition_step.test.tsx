/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClientProvider } from '@kbn/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { createTestQueryClient, createMockServices } from '../../../test_utils';
import { RuleFormProvider, type RuleFormServices } from '../../../form/contexts';
import { createInitialState } from '../use_compose_discover_state';
import type { ComposeDiscoverState } from '../types';
import type { ComposeFormValues, RuleKind, RuleQuery } from '../compose_form_types';
import { AlertConditionStep } from './alert_condition_step';

jest.mock('@kbn/esql-utils', () => ({
  getEsqlColumns: jest.fn().mockResolvedValue([]),
}));

jest.mock('@kbn/code-editor', () => ({
  ...jest.requireActual('@kbn/code-editor'),
  CodeEditor: ({ value }: { value: string }) => <pre data-test-subj="codeEditorMock">{value}</pre>,
}));

const createState = (overrides: Partial<ComposeDiscoverState> = {}): ComposeDiscoverState => ({
  ...createInitialState({ mode: 'create' }),
  ...overrides,
});

const BASE_COMPOSE_VALUES: ComposeFormValues = {
  kind: 'alert',
  metadata: { name: '', enabled: true },
  timeField: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { format: 'standalone', breach: '' },
  stateTransitionAlertDelayMode: 'immediate',
  stateTransitionRecoveryDelayMode: 'immediate',
};

const createComposeFormWrapper = (
  overrides: Partial<ComposeFormValues> = {},
  services: RuleFormServices = createMockServices()
) => {
  const queryClient = createTestQueryClient();
  const defaultValues: ComposeFormValues = { ...BASE_COMPOSE_VALUES, ...overrides };

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
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

  return Wrapper;
};

interface RenderOptions {
  isEditing?: boolean;
  kind?: RuleKind;
  query?: RuleQuery;
}

const renderStep = (
  stateOverrides: Partial<ComposeDiscoverState> = {},
  { isEditing = false, kind, query }: RenderOptions = {}
) => {
  const state = createState({
    queryCommitted: true,
    ...stateOverrides,
  });
  const dispatch = jest.fn();
  const onKindChange = jest.fn();
  const services = createMockServices();

  const formOverrides: Partial<ComposeFormValues> = {};
  if (kind) formOverrides.kind = kind;
  if (query) formOverrides.query = query;

  render(
    <AlertConditionStep
      state={state}
      dispatch={dispatch}
      services={services}
      onKindChange={onKindChange}
      isEditing={isEditing}
    />,
    { wrapper: createComposeFormWrapper(formOverrides, services) }
  );

  return { dispatch, state, onKindChange };
};

const STANDALONE_QUERY: RuleQuery = {
  format: 'standalone',
  breach: 'FROM logs-* | LIMIT 10',
};

const COMPOSED_QUERY: RuleQuery = {
  format: 'composed',
  base: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
  blocks: { breach: '| WHERE count > 100' },
};

const COMPOSED_QUERY_EMPTY_BASE: RuleQuery = {
  format: 'composed',
  base: '',
  blocks: { breach: '| WHERE count > 100' },
};

describe('AlertConditionStep', () => {
  describe('query display', () => {
    it('shows "No query defined yet" when query is not committed', () => {
      renderStep({ queryCommitted: false });

      expect(screen.getByText('No query defined yet')).toBeInTheDocument();
      expect(screen.getByTestId('composeDiscoverOpenEditor')).toBeInTheDocument();
    });

    it('shows standalone query summary for signal kind', () => {
      renderStep({ queryCommitted: true }, { kind: 'signal', query: STANDALONE_QUERY });

      expect(screen.getByTestId('composeDiscoverEditQuery')).toBeInTheDocument();
    });

    it('shows base and alert condition summaries for alert kind', () => {
      renderStep({ queryCommitted: true }, { kind: 'alert', query: COMPOSED_QUERY });

      expect(screen.getByText('Base query')).toBeInTheDocument();
      expect(screen.getByText('Alert condition')).toBeInTheDocument();
      expect(screen.getByTestId('composeDiscoverEditQueries')).toBeInTheDocument();
    });

    it('shows split-failed callout when base query is empty', () => {
      renderStep({ queryCommitted: true }, { kind: 'alert', query: COMPOSED_QUERY_EMPTY_BASE });

      expect(
        screen.getByText(/Couldn't automatically separate base query from alert condition/)
      ).toBeInTheDocument();
    });
  });

  describe('editor buttons', () => {
    it('disables "Open query editor" when child flyout is open', () => {
      renderStep({ queryCommitted: false, childOpen: true });

      expect(screen.getByTestId('composeDiscoverOpenEditor')).toBeDisabled();
    });

    it('disables "Edit query" when child flyout is open', () => {
      renderStep(
        { queryCommitted: true, childOpen: true },
        { kind: 'signal', query: STANDALONE_QUERY }
      );

      expect(screen.getByTestId('composeDiscoverEditQuery')).toBeDisabled();
    });

    it('disables "Edit queries" when child flyout is open', () => {
      renderStep(
        { queryCommitted: true, childOpen: true },
        { kind: 'alert', query: COMPOSED_QUERY }
      );

      expect(screen.getByTestId('composeDiscoverEditQueries')).toBeDisabled();
    });

    it('dispatches OPEN_CHILD_FOR_STEP on "Open query editor" click', () => {
      const { dispatch, state } = renderStep({ queryCommitted: false, childOpen: false });

      fireEvent.click(screen.getByTestId('composeDiscoverOpenEditor'));

      expect(dispatch).toHaveBeenCalledWith({
        type: 'OPEN_CHILD_FOR_STEP',
        step: state.step,
        isAlert: true,
      });
    });
  });

  describe('time field', () => {
    it('renders the time field selector', () => {
      renderStep({ queryCommitted: true });

      expect(screen.getByTestId('composeDiscoverTimeField')).toBeInTheDocument();
    });

    it('disables time field when child flyout is open', () => {
      renderStep({ queryCommitted: true, childOpen: true });

      expect(screen.getByTestId('composeDiscoverTimeField')).toBeDisabled();
    });
  });

  describe('group fields', () => {
    it('renders the group fields selector', () => {
      renderStep({ queryCommitted: true });

      expect(screen.getByTestId('composeDiscoverGroupFields')).toBeInTheDocument();
    });
  });

  describe('tracking toggle', () => {
    it('is enabled when queryCommitted is true and not editing', () => {
      renderStep({ queryCommitted: true }, { isEditing: false });

      expect(screen.getByTestId('composeDiscoverTrackingToggle')).not.toBeDisabled();
    });

    it('is disabled when editing an existing rule', () => {
      renderStep({ queryCommitted: true }, { isEditing: true });

      expect(screen.getByTestId('composeDiscoverTrackingToggle')).toBeDisabled();
    });

    it('is disabled when query is not committed', () => {
      renderStep({ queryCommitted: false }, { isEditing: false });

      expect(screen.getByTestId('composeDiscoverTrackingToggle')).toBeDisabled();
    });

    it('is checked when kind is alert', () => {
      renderStep({ queryCommitted: true }, { kind: 'alert' });

      expect(screen.getByTestId('composeDiscoverTrackingToggle')).toBeChecked();
    });

    it('is unchecked when kind is signal', () => {
      renderStep({ queryCommitted: true }, { kind: 'signal', query: STANDALONE_QUERY });

      expect(screen.getByTestId('composeDiscoverTrackingToggle')).not.toBeChecked();
    });

    it('calls onKindChange when toggled', () => {
      const { onKindChange } = renderStep({ queryCommitted: true }, { kind: 'alert' });

      fireEvent.click(screen.getByTestId('composeDiscoverTrackingToggle'));

      expect(onKindChange).toHaveBeenCalledWith('signal');
    });
  });

  describe('schedule and lookback', () => {
    it('renders schedule and lookback fields', () => {
      renderStep({ queryCommitted: true });

      expect(screen.getByText('Schedule')).toBeInTheDocument();
      expect(screen.getByText('Lookback Window')).toBeInTheDocument();
    });
  });
});
