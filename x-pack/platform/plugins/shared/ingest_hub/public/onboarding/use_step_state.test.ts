/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';

jest.mock('react-use/lib/useSessionStorage');

const mockUseSessionStorage = useSessionStorage as jest.MockedFunction<typeof useSessionStorage>;

// Back useSessionStorage with a real React.useState so setState triggers re-renders.
beforeEach(() => {
  mockUseSessionStorage.mockImplementation((_key, initial) => useState(initial));
});

import { useStepState } from './use_step_state';

const INTEGRATION_ID = 'aws';

describe('useStepState', () => {
  describe('markStepsIncomplete', () => {
    it('marks only the given step incomplete, leaving others unchanged', () => {
      const { result } = renderHook(() => useStepState(INTEGRATION_ID));

      act(() => result.current.markStepComplete('services'));
      act(() => result.current.markStepComplete('service-settings'));

      act(() => result.current.markStepsIncomplete(['service-settings']));

      expect(result.current.completedSteps.has('services')).toBe(true);
      expect(result.current.completedSteps.has('service-settings')).toBe(false);
    });

    it('is a no-op when given an empty array', () => {
      const { result } = renderHook(() => useStepState(INTEGRATION_ID));
      act(() => result.current.markStepComplete('services'));
      const before = result.current.completedSteps;

      act(() => result.current.markStepsIncomplete([]));

      expect(result.current.completedSteps).toBe(before);
    });

    it('is a no-op when all given steps are already incomplete (prevents render loops)', () => {
      const { result } = renderHook(() => useStepState(INTEGRATION_ID));
      const before = result.current.completedSteps;

      act(() =>
        result.current.markStepsIncomplete(['service-settings', 'authenticate-and-deploy'])
      );

      expect(result.current.completedSteps).toBe(before);
    });

    it('composes with markStepComplete within a single act', () => {
      const { result } = renderHook(() => useStepState(INTEGRATION_ID));

      act(() => {
        result.current.markStepComplete('services');
        result.current.markStepsIncomplete(['service-settings', 'authenticate-and-deploy']);
      });

      expect(result.current.completedSteps.has('services')).toBe(true);
      expect(result.current.completedSteps.has('service-settings')).toBe(false);
      expect(result.current.completedSteps.has('authenticate-and-deploy')).toBe(false);
    });

    it('firstIncompleteStepId recomputes after invalidation', () => {
      const { result } = renderHook(() => useStepState(INTEGRATION_ID));

      // Mark each step complete in its own act so stateRef.current is up-to-date
      // before the next markStepComplete reads it (they compose via stateRef, not
      // batched React state).
      act(() => result.current.markStepComplete('services'));
      act(() => result.current.markStepComplete('service-settings'));
      act(() => result.current.markStepComplete('authenticate-and-deploy'));
      act(() => result.current.markStepComplete('detect-and-review'));

      act(() => result.current.markStepsIncomplete(['service-settings']));

      // service-settings is now the first incomplete step.
      expect(result.current.firstIncompleteStepId).toBe('service-settings');
    });

    it('does not throw and does not corrupt known keys when given an unknown step id', () => {
      const { result } = renderHook(() => useStepState(INTEGRATION_ID));
      act(() => result.current.markStepComplete('services'));

      expect(() =>
        act(() => result.current.markStepsIncomplete(['nonexistent-step']))
      ).not.toThrow();

      expect(result.current.completedSteps.has('services')).toBe(true);
    });
  });
});
