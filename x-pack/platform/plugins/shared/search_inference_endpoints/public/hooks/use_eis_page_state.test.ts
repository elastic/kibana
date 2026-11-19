/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { EisInferenceEndpoint } from '../../common/types';
import { useEisModels } from './use_eis_models';
import { useKibana } from './use_kibana';
import { useEisPageState } from './use_eis_page_state';

jest.mock('./use_eis_models');
jest.mock('./use_kibana');

const mockUseEisModels = useEisModels as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;

const endpoint: EisInferenceEndpoint = {
  inference_id: '.elastic-model',
  task_type: 'chat_completion',
  service: 'elastic',
  service_settings: { model_id: 'elastic-model' },
};

const mockEnvironment = ({
  isCloudEnabled = false,
  hasCloudConnect = true,
  isCloudConnectStatusLoading = false,
  isCloudConnected = false,
  isCloudConnectEisEnabled = false,
  cloudConnectStatusError = null,
}: {
  isCloudEnabled?: boolean;
  hasCloudConnect?: boolean;
  isCloudConnectStatusLoading?: boolean;
  isCloudConnected?: boolean;
  isCloudConnectEisEnabled?: boolean;
  cloudConnectStatusError?: Error | null;
} = {}) => {
  mockUseKibana.mockReturnValue({
    services: {
      cloud: { isCloudEnabled },
      cloudConnect: hasCloudConnect
        ? {
            hooks: {
              useCloudConnectStatus: () => ({
                isCloudConnected,
                isCloudConnectEisEnabled,
                isCloudConnectAutoopsEnabled: false,
                isLoading: isCloudConnectStatusLoading,
                error: cloudConnectStatusError,
              }),
            },
          }
        : undefined,
    },
  });
};

const mockModels = ({
  data = [endpoint],
  isLoading = false,
  isError = false,
}: { data?: EisInferenceEndpoint[]; isLoading?: boolean; isError?: boolean } = {}) => {
  mockUseEisModels.mockReturnValue({ data, isLoading, isError });
};

describe('useEisPageState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnvironment();
    mockModels();
  });

  it('returns loading while models are loading', () => {
    mockModels({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useEisPageState());
    expect(result.current.pageState).toBe('loading');
  });

  it('returns unavailable when the request fails on self-managed', () => {
    mockModels({ data: undefined, isError: true });
    const { result } = renderHook(() => useEisPageState());
    expect(result.current.pageState).toBe('unavailable');
  });

  it('returns unavailable when the request fails on Cloud', () => {
    mockEnvironment({ isCloudEnabled: true });
    mockModels({ data: undefined, isError: true });
    const { result } = renderHook(() => useEisPageState());
    expect(result.current.pageState).toBe('unavailable');
  });

  it('returns selfManagedEmpty when self-managed, not connected, and no models', () => {
    mockModels({ data: [] });
    const { result } = renderHook(() => useEisPageState());
    expect(result.current.pageState).toBe('selfManagedEmpty');
  });

  it('returns loading when self-managed with no models while Cloud Connect status is loading', () => {
    mockEnvironment({ isCloudConnectStatusLoading: true });
    mockModels({ data: [] });
    const { result } = renderHook(() => useEisPageState());
    expect(result.current.pageState).toBe('loading');
  });

  it('returns models when self-managed with models while Cloud Connect status is loading', () => {
    mockEnvironment({ isCloudConnectStatusLoading: true });
    const { result } = renderHook(() => useEisPageState());
    expect(result.current.pageState).toBe('models');
  });

  it('returns models when self-managed with no models and the Cloud Connect plugin is unavailable', () => {
    mockEnvironment({ hasCloudConnect: false });
    mockModels({ data: [] });
    const { result } = renderHook(() => useEisPageState());
    expect(result.current.pageState).toBe('models');
  });

  it('returns models when self-managed with no models and the Cloud Connect status fails', () => {
    mockEnvironment({ cloudConnectStatusError: new Error('Cloud Connect status failed') });
    mockModels({ data: [] });
    const { result } = renderHook(() => useEisPageState());
    expect(result.current.pageState).toBe('models');
  });

  it('returns models when self-managed is connected with no models', () => {
    mockEnvironment({ isCloudConnected: true, isCloudConnectEisEnabled: true });
    mockModels({ data: [] });
    const { result } = renderHook(() => useEisPageState());
    expect(result.current.pageState).toBe('models');
  });

  it('returns unavailable on Cloud with no models', () => {
    mockEnvironment({ isCloudEnabled: true });
    mockModels({ data: [] });
    const { result } = renderHook(() => useEisPageState());
    expect(result.current.pageState).toBe('unavailable');
  });

  it('returns models on Cloud with models', () => {
    mockEnvironment({ isCloudEnabled: true });
    const { result } = renderHook(() => useEisPageState());
    expect(result.current.pageState).toBe('models');
  });

  it('returns serviceDisabled when connected, EIS is disabled, and models remain', () => {
    mockEnvironment({ isCloudConnected: true, isCloudConnectEisEnabled: false });
    const { result } = renderHook(() => useEisPageState());
    expect(result.current.pageState).toBe('serviceDisabled');
  });

  it('returns models when connected and EIS is enabled', () => {
    mockEnvironment({ isCloudConnected: true, isCloudConnectEisEnabled: true });
    const { result } = renderHook(() => useEisPageState());
    expect(result.current.pageState).toBe('models');
  });

  it('returns models when connected, EIS is disabled, and no models remain', () => {
    mockEnvironment({ isCloudConnected: true, isCloudConnectEisEnabled: false });
    mockModels({ data: [] });
    const { result } = renderHook(() => useEisPageState());
    expect(result.current.pageState).toBe('models');
  });

  it('returns serviceDisabled on Cloud when connected, EIS is disabled, and models remain', () => {
    mockEnvironment({ isCloudEnabled: true, isCloudConnected: true });
    const { result } = renderHook(() => useEisPageState());
    expect(result.current.pageState).toBe('serviceDisabled');
  });

  it('shows the Cloud Connect promo when the status has loaded and is not connected', () => {
    const { result } = renderHook(() => useEisPageState());
    expect(result.current.isCloudConnectPromoVisible).toBe(true);
  });

  it('hides the Cloud Connect promo while the status is loading', () => {
    mockEnvironment({ isCloudConnectStatusLoading: true });
    const { result } = renderHook(() => useEisPageState());
    expect(result.current.isCloudConnectPromoVisible).toBe(false);
  });

  it('hides the Cloud Connect promo when connected', () => {
    mockEnvironment({ isCloudConnected: true, isCloudConnectEisEnabled: true });
    const { result } = renderHook(() => useEisPageState());
    expect(result.current.isCloudConnectPromoVisible).toBe(false);
  });
});
