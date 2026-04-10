/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import {
  MANAGEMENT_APP_ID,
  MANAGEMENT_LLM_CONNECTORS_PATH,
  useIsOnManagementLlmConnectorsPage,
} from './use_navigation';

const currentAppId$ = new BehaviorSubject<string | undefined>(undefined);
const currentLocation$ = new BehaviorSubject<string>('');

const mockApplication = {
  currentAppId$,
  currentLocation$,
};

jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: mockApplication,
    },
  }),
}));

describe('useIsOnManagementLlmConnectorsPage', () => {
  beforeEach(() => {
    currentAppId$.next(undefined);
    currentLocation$.next('');
  });

  it('returns false when app id and location do not match', () => {
    const { result } = renderHook(() => useIsOnManagementLlmConnectorsPage());

    expect(result.current).toBe(false);
  });

  it('returns false when on management but not on LLM connectors path', () => {
    currentAppId$.next(MANAGEMENT_APP_ID);
    currentLocation$.next('/app/management/kibana/settings');

    const { result } = renderHook(() => useIsOnManagementLlmConnectorsPage());

    expect(result.current).toBe(false);
  });

  it('returns false when location matches path but app is not management', () => {
    currentAppId$.next('discover');
    currentLocation$.next(`/app/management${MANAGEMENT_LLM_CONNECTORS_PATH}`);

    const { result } = renderHook(() => useIsOnManagementLlmConnectorsPage());

    expect(result.current).toBe(false);
  });

  it('returns true when on management app and URL includes connectors path', () => {
    currentAppId$.next(MANAGEMENT_APP_ID);
    currentLocation$.next(`/s/default/app/management${MANAGEMENT_LLM_CONNECTORS_PATH}`);

    const { result } = renderHook(() => useIsOnManagementLlmConnectorsPage());

    expect(result.current).toBe(true);
  });

  it('updates when observables emit new values', async () => {
    currentAppId$.next(MANAGEMENT_APP_ID);
    currentLocation$.next('/app/management/kibana/settings');

    const { result } = renderHook(() => useIsOnManagementLlmConnectorsPage());

    expect(result.current).toBe(false);

    currentLocation$.next(`/app/management${MANAGEMENT_LLM_CONNECTORS_PATH}#tab`);

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});
