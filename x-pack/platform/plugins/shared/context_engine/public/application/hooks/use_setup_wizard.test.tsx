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
  aiIndex,
  memoryCount: 0,
  isMemoryEnabled: true,
  isMemoryCountReady: true,
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

  it('waits for the memory count before it decides', () => {
    const { result, rerender } = renderSetupWizard({ isMemoryCountReady: false });

    expect(result.current.status).toBe('loading');

    rerender({ ...defaultParams, isMemoryCountReady: true });

    expect(result.current).toMatchObject({ status: 'shown', currentStep: 'dreaming' });
  });

  it('hides the wizard of a closed AI index without waiting for the memory count', () => {
    writeSetupWizardStoredValue(storageKey, 'closed');

    const { result } = renderSetupWizard({ isMemoryCountReady: false });

    expect(result.current.status).toBe('hidden');
  });

  it('hides the wizard of a managed AI index without waiting for the memory count', () => {
    const { result } = renderSetupWizard({
      aiIndex: { ...aiIndex, managed: true },
      isMemoryCountReady: false,
    });

    expect(result.current.status).toBe('hidden');
  });

  it('keeps its decision while the Overview stays open, and decides again on the next visit', () => {
    const { result, rerender } = renderSetupWizard();
    expect(result.current.status).toBe('shown');

    const doneIndex: GetAiIndexResponse = {
      ...aiIndex,
      dreaming: { enabled: true },
      sources: [{ type: 'index', value: 'logs-*' }],
      description: 'Answers questions about checkouts.',
    };
    rerender({ ...defaultParams, aiIndex: doneIndex, memoryCount: 1 });
    expect(result.current.status).toBe('shown');

    rerender({ ...defaultParams, aiIndex: doneIndex, memoryCount: 1, isActive: false });
    rerender({ ...defaultParams, aiIndex: doneIndex, memoryCount: 1, isActive: true });
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
