/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ComposeDiscoverAction, ComposeDiscoverState } from '../types';
import { createInitialState } from '../use_compose_discover_state';
import type { RuleFormServices } from '../../../form/contexts/rule_form_context';
import { BuilderStateProvider } from './builder_state_context';
import { BuilderRecoveryStepHost, BuilderStepHost } from './builder_step_host';
import type { RuleBuilderDefinition } from './types';

interface TestState {
  label: string;
}

const uiState: ComposeDiscoverState = createInitialState({ mode: 'create' });
const dispatch: React.Dispatch<ComposeDiscoverAction> = () => undefined;
const services = {} as RuleFormServices;

const makeDefinition = (): RuleBuilderDefinition =>
  ({
    type: 'props-only',
    stepTitle: 'Props only',
    createDefaultState: () => ({ label: 'default' }),
    renderStep: ({ builderState, setBuilderState, initBuilderState }) => (
      <>
        <span data-test-subj="stepLabel">{(builderState as TestState).label}</span>
        <button
          data-test-subj="stepEdit"
          onClick={() => setBuilderState({ label: 'edited' })}
          type="button"
        >
          edit
        </button>
        <button
          data-test-subj="stepSeed"
          onClick={() => initBuilderState({ label: 'seeded' })}
          type="button"
        >
          seed
        </button>
      </>
    ),
    renderRecoveryStep: ({ builderState, setBuilderState }) => (
      <>
        <span data-test-subj="recoveryLabel">{(builderState as TestState).label}</span>
        <button
          data-test-subj="recoveryEdit"
          onClick={() => setBuilderState({ label: 'recovered' })}
          type="button"
        >
          edit recovery
        </button>
      </>
    ),
  } as RuleBuilderDefinition);

describe('BuilderStepHost', () => {
  it('passes builder state and both setters to renderStep', () => {
    const setBuilderState = jest.fn();
    const initBuilderState = jest.fn();

    render(
      <BuilderStateProvider
        builderState={{ label: 'current' }}
        setBuilderState={setBuilderState}
        initBuilderState={initBuilderState}
      >
        <BuilderStepHost
          definition={makeDefinition()}
          state={uiState}
          dispatch={dispatch}
          services={services}
        />
      </BuilderStateProvider>
    );

    expect(screen.getByTestId('stepLabel')).toHaveTextContent('current');

    fireEvent.click(screen.getByTestId('stepEdit'));
    expect(setBuilderState).toHaveBeenCalledWith({ label: 'edited' });

    fireEvent.click(screen.getByTestId('stepSeed'));
    expect(initBuilderState).toHaveBeenCalledWith({ label: 'seeded' });
  });
});

describe('BuilderRecoveryStepHost', () => {
  it('passes builder state and its setter to renderRecoveryStep', () => {
    const setBuilderState = jest.fn();

    render(
      <BuilderStateProvider builderState={{ label: 'current' }} setBuilderState={setBuilderState}>
        <BuilderRecoveryStepHost
          definition={makeDefinition()}
          state={uiState}
          dispatch={dispatch}
        />
      </BuilderStateProvider>
    );

    expect(screen.getByTestId('recoveryLabel')).toHaveTextContent('current');

    fireEvent.click(screen.getByTestId('recoveryEdit'));
    expect(setBuilderState).toHaveBeenCalledWith({ label: 'recovered' });
  });
});
