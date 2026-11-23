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
import { readSetupWizardStoredValue, writeSetupWizardStoredValue } from '../utils/setup_wizard';
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

    expect(result.current.view).toBeUndefined();

    rerender({ ...defaultParams, isMemoryCountReady: true });

    expect(result.current.view).toMatchObject({ show: true, initialStep: 'dreaming' });
  });

  it('hides the wizard of a closed AI index without waiting for the memory count', () => {
    writeSetupWizardStoredValue(storageKey, 'closed');

    const { result } = renderSetupWizard({ isMemoryCountReady: false });

    expect(result.current.view).toEqual({ show: false });
  });

  it('hides the wizard of a managed AI index without waiting for the memory count', () => {
    const { result } = renderSetupWizard({
      aiIndex: { ...aiIndex, managed: true },
      isMemoryCountReady: false,
    });

    expect(result.current.view).toEqual({ show: false });
  });

  it('keeps its decision while the Overview stays open, and decides again on the next visit', () => {
    const { result, rerender } = renderSetupWizard();
    expect(result.current.view).toMatchObject({ show: true });

    const doneIndex: GetAiIndexResponse = {
      ...aiIndex,
      dreaming: { enabled: true },
      sources: [{ type: 'index', value: 'logs-*' }],
      description: 'Answers questions about checkouts.',
    };
    rerender({ ...defaultParams, aiIndex: doneIndex, memoryCount: 1 });
    expect(result.current.view).toMatchObject({ show: true });

    rerender({ ...defaultParams, aiIndex: doneIndex, memoryCount: 1, isActive: false });
    rerender({ ...defaultParams, aiIndex: doneIndex, memoryCount: 1, isActive: true });
    expect(result.current.view).toEqual({ show: false });
  });

  it('saves the step and closes for good', () => {
    const { result } = renderSetupWizard();

    act(() => result.current.saveStep('sources'));
    expect(readSetupWizardStoredValue(storageKey)).toBe('sources');

    act(() => result.current.close());
    expect(readSetupWizardStoredValue(storageKey)).toBe('closed');
    expect(result.current.view).toEqual({ show: false });
  });
});
