/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { uiPrivileges } from '../../../common/features';
import { createTestStep, testAiIndex } from '../components/ai_index_detail/setup_wizard/test_utils';
import {
  SETUP_WIZARD_STORAGE_KEY,
  readSetupWizardStoredValue,
  writeSetupWizardStoredValue,
} from '../utils/setup_wizard_storage';
import type { SetupWizardProgress } from '../utils/setup_wizard_view';
import { useSetupWizard } from './use_setup_wizard';

const steps = [
  createTestStep({ id: 'a', isDone: ({ aiIndex }) => aiIndex.sources.length > 0 }),
  createTestStep({ id: 'b', isDone: ({ memoryCount }) => memoryCount > 0, isOptional: true }),
  createTestStep({ id: 'c', isDone: ({ aiIndex }) => aiIndex.description !== undefined }),
];

const progress: SetupWizardProgress = {
  aiIndex: testAiIndex,
  dreaming: undefined,
  memoryCount: 0,
  isMemoryEnabled: true,
};

const storageKey = { basePath: '', aiIndexId: testAiIndex.id };

type Params = Parameters<typeof useSetupWizard>[0];

const defaultParams: Params = {
  aiIndexId: testAiIndex.id,
  steps,
  progress,
  isProgressLoading: false,
  isProgressError: false,
  isActive: true,
};

const renderSetupWizard = (params: Partial<Params> = {}, { canWrite = true } = {}) => {
  const services = coreMock.createStart();
  services.application.capabilities = {
    ...services.application.capabilities,
    contextEngine: { show: true, [uiPrivileges.write]: canWrite },
  };
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
  );
  return renderHook((props: Params) => useSetupWizard(props), {
    wrapper,
    initialProps: { ...defaultParams, ...params },
  });
};

describe('useSetupWizard', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('waits for the progress data before it decides', () => {
    const { result, rerender } = renderSetupWizard({ isProgressLoading: true });

    expect(result.current.status).toBe('loading');

    rerender(defaultParams);

    expect(result.current).toMatchObject({ status: 'shown', currentStepId: 'a' });
  });

  it('waits while the AI index loads', () => {
    const { result } = renderSetupWizard({ progress: undefined });

    expect(result.current.status).toBe('loading');
  });

  it('hides the wizard right away for a user who cannot write', () => {
    const { result } = renderSetupWizard({ progress: undefined }, { canWrite: false });

    expect(result.current.status).toBe('hidden');
  });

  it('shows the normal Overview when the progress failed to load, even with steps not done', () => {
    const { result } = renderSetupWizard({ isProgressError: true });

    expect(result.current.status).toBe('hidden');
  });

  it('does not wait for the rest of the progress data when a request already failed', () => {
    const { result } = renderSetupWizard({ isProgressLoading: true, isProgressError: true });

    expect(result.current.status).toBe('hidden');
  });

  it('hides the wizard of a closed AI index without waiting for any data', () => {
    writeSetupWizardStoredValue(storageKey, 'closed');

    expect(renderSetupWizard({ progress: undefined }).result.current.status).toBe('hidden');
    expect(renderSetupWizard({ isProgressLoading: true }).result.current.status).toBe('hidden');
  });

  it('hides the wizard of a managed AI index without waiting for its progress data', () => {
    const { result } = renderSetupWizard({
      progress: { ...progress, aiIndex: { ...testAiIndex, managed: true } },
      isProgressLoading: true,
    });

    expect(result.current.status).toBe('hidden');
  });

  it('gives the steps that are done', () => {
    const { result } = renderSetupWizard({ progress: { ...progress, memoryCount: 1 } });

    expect(result.current).toMatchObject({ status: 'shown', doneStepIds: new Set(['b']) });
  });

  it('keeps its decision while the Overview stays open, and decides again on the next visit', () => {
    const { result, rerender } = renderSetupWizard();
    expect(result.current.status).toBe('shown');

    const doneParams: Params = {
      ...defaultParams,
      progress: {
        ...progress,
        aiIndex: {
          ...testAiIndex,
          sources: [{ type: 'esql', value: 'FROM logs-*' }],
          description: 'Answers questions about checkouts.',
        },
      },
    };
    rerender(doneParams);
    expect(result.current.status).toBe('shown');

    rerender({ ...doneParams, isActive: false });
    rerender({ ...doneParams, isActive: true });
    expect(result.current.status).toBe('hidden');
  });

  it('keeps the step only in local storage and reads it live', () => {
    const { result } = renderSetupWizard();
    expect(result.current).toMatchObject({ status: 'shown', currentStepId: 'a' });

    act(() => {
      if (result.current.status === 'shown') {
        result.current.goToStep('c');
      }
    });

    expect(readSetupWizardStoredValue(storageKey)).toBe('c');
    expect(result.current).toMatchObject({ status: 'shown', currentStepId: 'c' });
  });

  it('follows a step change made in another browser tab', () => {
    const { result } = renderSetupWizard();

    act(() => {
      window.localStorage.setItem(
        SETUP_WIZARD_STORAGE_KEY,
        JSON.stringify({ '/my-ai-index': 'c' })
      );
      window.dispatchEvent(new StorageEvent('storage'));
    });

    expect(result.current).toMatchObject({ status: 'shown', currentStepId: 'c' });
  });

  it('close hides the wizard for good', () => {
    const { result } = renderSetupWizard();

    act(() => {
      if (result.current.status === 'shown') {
        result.current.close();
      }
    });

    expect(readSetupWizardStoredValue(storageKey)).toBe('closed');
    expect(result.current.status).toBe('hidden');
  });
});
