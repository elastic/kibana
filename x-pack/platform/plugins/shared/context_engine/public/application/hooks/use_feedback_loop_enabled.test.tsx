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
import { BehaviorSubject } from 'rxjs';
import { CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID } from '../../../common/constants';
import { useFeedbackLoopEnabled } from './use_feedback_loop_enabled';

const setup = ({
  value,
  updates,
}: { value?: unknown; updates?: BehaviorSubject<unknown> } = {}) => {
  const services = coreMock.createStart();
  services.settings.globalClient.get.mockReturnValue(value);
  const subject = updates ?? new BehaviorSubject<unknown>(value);
  services.settings.globalClient.get$.mockReturnValue(subject as never);

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
  );

  return { wrapper, services, subject };
};

describe('useFeedbackLoopEnabled', () => {
  it('reads the global feedback-loop setting', () => {
    const { wrapper, services } = setup({ value: true });

    const { result } = renderHook(() => useFeedbackLoopEnabled(), { wrapper });

    expect(services.settings.globalClient.get).toHaveBeenCalledWith(
      CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID,
      false
    );
    expect(result.current).toBe(true);
  });

  // Callers pass this to React Query's `enabled`, where undefined means "on". An unset setting
  // has to read as off, not as absent.
  it('reads an unset setting as off rather than undefined', () => {
    const { wrapper } = setup({ value: undefined });

    const { result } = renderHook(() => useFeedbackLoopEnabled(), { wrapper });

    expect(result.current).toBe(false);
  });

  it('follows the setting being switched on', () => {
    const subject = new BehaviorSubject<unknown>(false);
    const { wrapper } = setup({ value: false, updates: subject });

    const { result } = renderHook(() => useFeedbackLoopEnabled(), { wrapper });
    expect(result.current).toBe(false);

    act(() => subject.next(true));

    expect(result.current).toBe(true);
  });

  it('coerces a later undefined to off as well', () => {
    const subject = new BehaviorSubject<unknown>(true);
    const { wrapper } = setup({ value: true, updates: subject });

    const { result } = renderHook(() => useFeedbackLoopEnabled(), { wrapper });

    act(() => subject.next(undefined));

    expect(result.current).toBe(false);
  });
});
