/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useImportSteps, ImportStep } from './use_import_steps';

describe('useImportSteps', () => {
  it('starts on the UploadYaml step', () => {
    const { result } = renderHook(() => useImportSteps({ isSelectEnabled: false }));

    expect(result.current.currentStep).toBe(ImportStep.UploadYaml);
    expect(result.current.isFirstStep).toBe(true);
    expect(result.current.isLastStep).toBe(false);
  });

  it('transitions to SelectTemplates step via goToStep', () => {
    const { result } = renderHook(() => useImportSteps({ isSelectEnabled: true }));

    act(() => {
      result.current.goToStep(ImportStep.SelectTemplates);
    });

    expect(result.current.currentStep).toBe(ImportStep.SelectTemplates);
    expect(result.current.isFirstStep).toBe(false);
    expect(result.current.isLastStep).toBe(true);
  });

  it('transitions back to UploadYaml step', () => {
    const { result } = renderHook(() => useImportSteps({ isSelectEnabled: true }));

    act(() => {
      result.current.goToStep(ImportStep.SelectTemplates);
    });
    act(() => {
      result.current.goToStep(ImportStep.UploadYaml);
    });

    expect(result.current.currentStep).toBe(ImportStep.UploadYaml);
    expect(result.current.isFirstStep).toBe(true);
  });

  it('returns horizontal steps with correct statuses when on step 1', () => {
    const { result } = renderHook(() => useImportSteps({ isSelectEnabled: true }));

    const [uploadStep, selectStep] = result.current.horizontalSteps;
    expect(uploadStep.status).toBe('current');
    expect(selectStep.status).toBe('incomplete');
  });

  it('returns horizontal steps with correct statuses when on step 2', () => {
    const { result } = renderHook(() => useImportSteps({ isSelectEnabled: true }));

    act(() => {
      result.current.goToStep(ImportStep.SelectTemplates);
    });

    const [uploadStep, selectStep] = result.current.horizontalSteps;
    expect(uploadStep.status).toBe('complete');
    expect(selectStep.status).toBe('current');
  });

  it('disables step 2 when isSelectEnabled is false', () => {
    const { result } = renderHook(() => useImportSteps({ isSelectEnabled: false }));

    const [, selectStep] = result.current.horizontalSteps;
    expect(selectStep.status).toBe('disabled');
  });

  it('enables step 2 when isSelectEnabled becomes true', () => {
    const { result, rerender } = renderHook(
      (props: { isSelectEnabled: boolean }) => useImportSteps(props),
      { initialProps: { isSelectEnabled: false } }
    );

    expect(result.current.horizontalSteps[1].status).toBe('disabled');

    rerender({ isSelectEnabled: true });

    expect(result.current.horizontalSteps[1].status).toBe('incomplete');
  });
});
