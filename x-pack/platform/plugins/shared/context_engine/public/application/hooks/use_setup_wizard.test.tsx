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
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import {
  SETUP_WIZARD_STORAGE_KEY,
  readSetupWizardStoredValue,
  writeSetupWizardStoredValue,
} from '../utils/setup_wizard';
import { useSetupWizard } from './use_setup_wizard';

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const storageKey = { basePath: '', aiIndexId: aiIndex.id };

type Params = Parameters<typeof useSetupWizard>[0];

const defaultParams: Params = {
  aiIndexId: aiIndex.id,
  aiIndex,
  dreaming: undefined,
  memoryCount: 0,
  isMemoryEnabled: true,
  isProgressReady: true,
  isProgressError: false,
  isActive: true,
};

const renderSetupWizard = (params: Partial<Params> = {}) => {
  const services = coreMock.createStart();
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

  it('waits for the memory count and dreaming config before it decides', () => {
    const { result, rerender } = renderSetupWizard({ isProgressReady: false });

    expect(result.current.status).toBe('loading');

    rerender({ ...defaultParams, isProgressReady: true });

    expect(result.current).toMatchObject({ status: 'shown', currentStep: 'dreaming' });
  });

  it('shows the normal Overview when the progress failed to load, even with steps not done', () => {
    const { result } = renderSetupWizard({ isProgressError: true });

    expect(result.current.status).toBe('hidden');
  });

  it('does not wait for the rest of the progress data when a request already failed', () => {
    const { result } = renderSetupWizard({ isProgressReady: false, isProgressError: true });

    expect(result.current.status).toBe('hidden');
  });

  it('shows the wizard when the progress loaded without an error', () => {
    const { result } = renderSetupWizard({ isProgressReady: true, isProgressError: false });

    expect(result.current).toMatchObject({ status: 'shown', currentStep: 'dreaming' });
  });

  it('hides the wizard of a closed AI index without waiting for its progress data', () => {
    writeSetupWizardStoredValue(storageKey, 'closed');

    const { result } = renderSetupWizard({ isProgressReady: false });

    expect(result.current.status).toBe('hidden');
  });

  it('hides the wizard of a managed AI index without waiting for its progress data', () => {
    const { result } = renderSetupWizard({
      aiIndex: { ...aiIndex, managed: true },
      isProgressReady: false,
    });

    expect(result.current.status).toBe('hidden');
  });

  it('keeps its decision while the Overview stays open, and decides again on the next visit', () => {
    const { result, rerender } = renderSetupWizard();
    expect(result.current.status).toBe('shown');

    const doneIndex: GetAiIndexResponse = {
      ...aiIndex,
      sources: [{ type: 'esql', value: 'FROM logs-*' }],
      description: 'Answers questions about checkouts.',
    };
    const doneParams: Params = {
      ...defaultParams,
      aiIndex: doneIndex,
      dreaming: { enabled: true },
      memoryCount: 1,
    };
    rerender(doneParams);
    expect(result.current.status).toBe('shown');

    rerender({ ...doneParams, isActive: false });
    rerender({ ...doneParams, isActive: true });
    expect(result.current.status).toBe('hidden');
  });

  it('keeps the step only in local storage and reads it live', () => {
    const { result } = renderSetupWizard();
    expect(result.current).toMatchObject({ status: 'shown', currentStep: 'dreaming' });

    act(() => {
      if (result.current.status === 'shown') {
        result.current.goToStep('sources');
      }
    });

    expect(readSetupWizardStoredValue(storageKey)).toBe('sources');
    expect(result.current).toMatchObject({ status: 'shown', currentStep: 'sources' });
  });

  it('follows a step change made in another browser tab', () => {
    const { result } = renderSetupWizard();

    act(() => {
      window.localStorage.setItem(
        SETUP_WIZARD_STORAGE_KEY,
        JSON.stringify({ '/my-ai-index': 'describe' })
      );
      window.dispatchEvent(new StorageEvent('storage'));
    });

    expect(result.current).toMatchObject({ status: 'shown', currentStep: 'describe' });
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
