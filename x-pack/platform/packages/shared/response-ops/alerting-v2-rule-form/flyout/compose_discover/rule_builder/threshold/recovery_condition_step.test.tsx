/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FormProvider, useForm, useFormContext, useFormState } from 'react-hook-form';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { BuilderRecoveryForm } from './recovery_condition_step';
import { BuilderStateProvider } from '../builder_state_context';
import type { ThresholdFormValues } from './form_types';
import { Aggregation, Comparator, DEFAULT_THRESHOLD_FORM_VALUES } from './form_types';
import { buildRecoveryBlock } from './build_esql';
import type { FormValues } from '../../../../form/types';
import type { ComposeDiscoverAction } from '../../types';
import { createInitialState } from '../../use_compose_discover_state';

const makeBuilderState = (overrides: Partial<ThresholdFormValues> = {}): ThresholdFormValues => ({
  ...DEFAULT_THRESHOLD_FORM_VALUES,
  ...overrides,
});

const BASE_COMPOSE_VALUES: FormValues = {
  kind: 'alert',
  metadata: { name: 'Test rule', enabled: true },
  timeField: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { base: '', breach: { segment: '' } },
  stateTransitionAlertDelayMode: 'immediate',
  stateTransitionRecoveryDelayMode: 'immediate',
  artifacts: [],
  runbookArtifacts: [],
  dashboardArtifacts: [],
};

const defaultUiState = createInitialState({ mode: 'create' });
const noopDispatch: React.Dispatch<ComposeDiscoverAction> = () => undefined;

const renderRecoveryForm = () => (
  <BuilderRecoveryForm state={defaultUiState} dispatch={noopDispatch} />
);

const Wrapper: React.FC<{
  builderState: ThresholdFormValues;
  onBuilderStateChange: (s: ThresholdFormValues) => void;
  children: React.ReactNode;
}> = ({ builderState, onBuilderStateChange, children }) => {
  const form = useForm<FormValues>({ defaultValues: BASE_COMPOSE_VALUES });

  return (
    <IntlProvider locale="en">
      <FormProvider {...form}>
        <BuilderStateProvider
          builderState={builderState}
          setBuilderState={onBuilderStateChange as (s: unknown) => void}
        >
          {children}
        </BuilderStateProvider>
      </FormProvider>
    </IntlProvider>
  );
};

interface RecoverySeedSnapshot {
  isDirty: boolean;
  dirtyFieldNames: string[];
  segment: string | undefined;
  builderDirty: boolean;
}

/** Reads RHF dirty state. `useFormState` is required so `isDirty` actually subscribes. */
const RecoverySeedProbe: React.FC<{
  builderDirty: boolean;
  onSnapshot: (snapshot: RecoverySeedSnapshot) => void;
}> = ({ builderDirty, onSnapshot }) => {
  const { getValues } = useFormContext<FormValues>();
  const { isDirty, dirtyFields } = useFormState<FormValues>();
  const recovery = getValues('recovery');
  const segment = recovery && 'segment' in recovery ? recovery.segment : undefined;

  useEffect(() => {
    onSnapshot({
      isDirty,
      dirtyFieldNames: Object.keys(dirtyFields),
      segment,
      builderDirty,
    });
  }, [onSnapshot, isDirty, dirtyFields, segment, builderDirty]);

  return null;
};

/**
 * Mirrors the flyout: mount-time seeds go through `initBuilderState` and must
 * not mark unsaved changes; later edits go through `setBuilderState` and do.
 */
const StatefulRecoveryHarness: React.FC<{
  initialBuilderState: ThresholdFormValues;
  onUserEdit: (state: ThresholdFormValues) => void;
  onInit: (state: ThresholdFormValues) => void;
  onSnapshot: (snapshot: RecoverySeedSnapshot) => void;
}> = ({ initialBuilderState, onUserEdit, onInit, onSnapshot }) => {
  const [builderState, setBuilderState] = useState(initialBuilderState);
  const [builderDirty, setBuilderDirty] = useState(false);
  const form = useForm<FormValues>({ defaultValues: BASE_COMPOSE_VALUES });

  const handleUserEdit = useCallback(
    (next: ThresholdFormValues) => {
      onUserEdit(next);
      setBuilderDirty(true);
      setBuilderState(next);
    },
    [onUserEdit]
  );

  const handleInit = useCallback(
    (next: ThresholdFormValues) => {
      onInit(next);
      setBuilderState(next);
    },
    [onInit]
  );

  return (
    <IntlProvider locale="en">
      <FormProvider {...form}>
        <BuilderStateProvider
          builderState={builderState}
          setBuilderState={handleUserEdit as (s: unknown) => void}
          initBuilderState={handleInit as (s: unknown) => void}
        >
          <RecoverySeedProbe builderDirty={builderDirty} onSnapshot={onSnapshot} />
          {renderRecoveryForm()}
        </BuilderStateProvider>
      </FormProvider>
    </IntlProvider>
  );
};

describe('BuilderRecoveryForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when recovery config is not set and no valid alert conditions exist', () => {
    const setBuilderState = jest.fn();
    const builderState = makeBuilderState({
      alertConditions: [{ id: '1', metric: '', comparator: Comparator.GT, threshold: [] }],
      recovery: undefined,
    });

    render(
      <Wrapper builderState={builderState} onBuilderStateChange={setBuilderState}>
        {renderRecoveryForm()}
      </Wrapper>
    );

    expect(setBuilderState).toHaveBeenCalled();
    const call = setBuilderState.mock.calls[0][0] as ThresholdFormValues;
    expect(call.recovery).toBeDefined();
    expect(call.recovery!.conditions.length).toBe(1);
  });

  it('renders recovery conditions with title and add button', () => {
    const builderState = makeBuilderState({
      recovery: {
        conditions: [{ id: '1', metric: 'count', comparator: Comparator.LTE, threshold: [100] }],
        conditionOperator: 'AND',
      },
    });

    render(
      <Wrapper builderState={builderState} onBuilderStateChange={jest.fn()}>
        {renderRecoveryForm()}
      </Wrapper>
    );

    expect(screen.getByText('Recovery threshold conditions')).toBeTruthy();
    expect(screen.getByTestId('ruleBuilderRecoveryMetric-0')).toBeTruthy();
    expect(screen.getByTestId('ruleBuilderRecoveryComparator-0')).toBeTruthy();
    expect(screen.getByTestId('ruleBuilderRecoveryThreshold-0')).toBeTruthy();
    expect(screen.getByTestId('ruleBuilderAddRecoveryCondition')).toBeTruthy();
  });

  it('shows operator toggle when multiple conditions exist', () => {
    const builderState = makeBuilderState({
      recovery: {
        conditions: [
          { id: '1', metric: 'count', comparator: Comparator.LTE, threshold: [100] },
          { id: '2', metric: 'errors', comparator: Comparator.LT, threshold: [5] },
        ],
        conditionOperator: 'AND',
      },
    });

    render(
      <Wrapper builderState={builderState} onBuilderStateChange={jest.fn()}>
        {renderRecoveryForm()}
      </Wrapper>
    );

    expect(screen.getByTestId('ruleBuilderRecoveryConditionOperator')).toBeTruthy();
    expect(screen.getByTestId('ruleBuilderRecoveryMetric-0')).toBeTruthy();
    expect(screen.getByTestId('ruleBuilderRecoveryMetric-1')).toBeTruthy();
  });

  it('does not show operator toggle for a single condition', () => {
    const builderState = makeBuilderState({
      recovery: {
        conditions: [{ id: '1', metric: 'count', comparator: Comparator.LTE, threshold: [100] }],
        conditionOperator: 'AND',
      },
    });

    render(
      <Wrapper builderState={builderState} onBuilderStateChange={jest.fn()}>
        {renderRecoveryForm()}
      </Wrapper>
    );

    expect(screen.queryByTestId('ruleBuilderRecoveryConditionOperator')).toBeNull();
  });

  it('calls setBuilderState when add condition button is clicked', () => {
    const setBuilderState = jest.fn();
    const builderState = makeBuilderState({
      recovery: {
        conditions: [{ id: '1', metric: 'count', comparator: Comparator.LTE, threshold: [100] }],
        conditionOperator: 'AND',
      },
    });

    render(
      <Wrapper builderState={builderState} onBuilderStateChange={setBuilderState}>
        {renderRecoveryForm()}
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('ruleBuilderAddRecoveryCondition'));

    expect(setBuilderState).toHaveBeenCalled();
    const lastCall = setBuilderState.mock.calls[setBuilderState.mock.calls.length - 1][0];
    expect(lastCall.recovery.conditions.length).toBe(2);
  });

  it('calls setBuilderState when remove condition button is clicked', () => {
    const setBuilderState = jest.fn();
    const builderState = makeBuilderState({
      recovery: {
        conditions: [
          { id: '1', metric: 'count', comparator: Comparator.LTE, threshold: [100] },
          { id: '2', metric: 'errors', comparator: Comparator.LT, threshold: [5] },
        ],
        conditionOperator: 'AND',
      },
    });

    render(
      <Wrapper builderState={builderState} onBuilderStateChange={setBuilderState}>
        {renderRecoveryForm()}
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('ruleBuilderRemoveRecoveryCondition-0'));

    expect(setBuilderState).toHaveBeenCalled();
    const lastCall = setBuilderState.mock.calls[setBuilderState.mock.calls.length - 1][0];
    expect(lastCall.recovery.conditions.length).toBe(1);
  });

  it('seeds a newly added recovery condition with a currently valid metric after a stat rename', () => {
    const setBuilderState = jest.fn();
    const builderState = makeBuilderState({
      stats: [{ id: 'stat-1', label: 'my_metric', aggregation: Aggregation.COUNT }],
      recovery: {
        conditions: [
          { id: '1', metric: 'my_metric', comparator: Comparator.LTE, threshold: [100] },
        ],
        conditionOperator: 'AND',
      },
    });

    render(
      <Wrapper builderState={builderState} onBuilderStateChange={setBuilderState}>
        {renderRecoveryForm()}
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('ruleBuilderAddRecoveryCondition'));

    expect(setBuilderState).toHaveBeenCalled();
    const lastCall = setBuilderState.mock.calls[setBuilderState.mock.calls.length - 1][0];
    expect(lastCall.recovery.conditions).toHaveLength(2);
    expect(lastCall.recovery.conditions[1].metric).toBe('my_metric');
  });

  it('seeds missing recovery without unsaved changes and marks a later edit dirty', async () => {
    const onUserEdit = jest.fn();
    const onInit = jest.fn();
    const snapshotRef: { current: RecoverySeedSnapshot | undefined } = { current: undefined };
    const initialBuilderState = makeBuilderState({
      alertConditions: [{ id: '1', metric: 'count', comparator: Comparator.GT, threshold: [100] }],
      recovery: undefined,
    });
    const expectedSegment = buildRecoveryBlock({
      ...initialBuilderState,
      recovery: {
        conditions: [{ id: 'seed', metric: 'count', comparator: Comparator.LTE, threshold: [100] }],
        conditionOperator: 'AND',
      },
    });

    render(
      <StatefulRecoveryHarness
        initialBuilderState={initialBuilderState}
        onUserEdit={onUserEdit}
        onInit={onInit}
        onSnapshot={(snapshot) => {
          snapshotRef.current = snapshot;
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Recovery threshold conditions')).toBeTruthy();
    });

    expect(onUserEdit).not.toHaveBeenCalled();
    expect(onInit).toHaveBeenCalled();
    const seeded = onInit.mock.calls[0][0] as ThresholdFormValues;
    expect(seeded.recovery?.conditions[0]).toEqual(
      expect.objectContaining({
        metric: 'count',
        comparator: Comparator.LTE,
        threshold: [100],
      })
    );

    await waitFor(() => {
      expect(snapshotRef.current).toEqual({
        isDirty: false,
        builderDirty: false,
        dirtyFieldNames: [],
        segment: expectedSegment,
      });
    });

    fireEvent.change(screen.getByTestId('ruleBuilderRecoveryThreshold-0'), {
      target: { value: '40' },
    });

    await waitFor(() => {
      expect(onUserEdit).toHaveBeenCalled();
      expect(snapshotRef.current?.builderDirty).toBe(true);
      expect(snapshotRef.current?.isDirty).toBe(true);
      expect(snapshotRef.current?.dirtyFieldNames).toContain('recovery');
    });
  });

  it('derives recovery conditions from alert conditions on init', () => {
    const setBuilderState = jest.fn();
    const builderState = makeBuilderState({
      alertConditions: [{ id: '1', metric: 'count', comparator: Comparator.GT, threshold: [100] }],
      recovery: undefined,
    });

    render(
      <Wrapper builderState={builderState} onBuilderStateChange={setBuilderState}>
        {renderRecoveryForm()}
      </Wrapper>
    );

    expect(setBuilderState).toHaveBeenCalled();
    const call = setBuilderState.mock.calls[0][0] as ThresholdFormValues;
    expect(call.recovery!.conditions[0].metric).toBe('count');
    expect(call.recovery!.conditions[0].comparator).toBe(Comparator.LTE);
    expect(call.recovery!.conditions[0].threshold).toEqual([100]);
  });
});
