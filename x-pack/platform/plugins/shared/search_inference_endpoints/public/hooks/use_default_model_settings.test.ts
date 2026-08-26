/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { Subject } from 'rxjs';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { useDefaultModelSettings } from './use_default_model_settings';
import { useKibana } from './use_kibana';
import { NO_DEFAULT_MODEL } from '../../common/constants';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;

type SettingsStore = Record<string, unknown>;

const buildSettingsClient = (initial: SettingsStore = {}) => {
  const store: SettingsStore = {
    [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: NO_DEFAULT_MODEL,
    [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
    ...initial,
  };
  const update$ = new Subject<{ key: string }>();
  return {
    get: jest.fn(<T>(key: string, _defaultValue: T): T => store[key] as T),
    set: jest.fn(async (key: string, value: unknown) => {
      store[key] = value;
      update$.next({ key });
    }),
    getUpdate$: () => update$.asObservable(),
    store,
  };
};

const buildNotifications = () => ({
  toasts: {
    addSuccess: jest.fn(),
    addDanger: jest.fn(),
  },
});

describe('useDefaultModelSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('derives enableAi=true and featureSpecificModels=true when AI is configured', () => {
    const settingsClient = buildSettingsClient({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'pre-1',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
    });
    mockUseKibana.mockReturnValue({
      services: { settings: { client: settingsClient }, notifications: buildNotifications() },
    });

    const { result } = renderHook(() => useDefaultModelSettings());

    expect(result.current.state.enableAi).toBe(true);
    expect(result.current.state.defaultModelId).toBe('pre-1');
    expect(result.current.state.featureSpecificModels).toBe(true);
  });

  it('derives featureSpecificModels=false when the persisted disallow flag is true', () => {
    const settingsClient = buildSettingsClient({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'pre-1',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: true,
    });
    mockUseKibana.mockReturnValue({
      services: { settings: { client: settingsClient }, notifications: buildNotifications() },
    });

    const { result } = renderHook(() => useDefaultModelSettings());

    expect(result.current.state.enableAi).toBe(true);
    expect(result.current.state.featureSpecificModels).toBe(false);
  });

  it('derives enableAi=false when both settings indicate AI is opted-out', () => {
    const settingsClient = buildSettingsClient({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: NO_DEFAULT_MODEL,
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: true,
    });
    mockUseKibana.mockReturnValue({
      services: { settings: { client: settingsClient }, notifications: buildNotifications() },
    });

    const { result } = renderHook(() => useDefaultModelSettings());

    expect(result.current.state.enableAi).toBe(false);
  });

  it('toggling enableAi off collapses to the opted-out persisted shape and flags dirty', () => {
    const settingsClient = buildSettingsClient({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'pre-1',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
    });
    mockUseKibana.mockReturnValue({
      services: { settings: { client: settingsClient }, notifications: buildNotifications() },
    });

    const { result } = renderHook(() => useDefaultModelSettings());

    act(() => {
      result.current.setEnableAi(false);
    });

    expect(result.current.state).toEqual({
      enableAi: false,
      defaultModelId: NO_DEFAULT_MODEL,
      featureSpecificModels: false,
    });
    expect(result.current.isDirty).toBe(true);
  });

  it('toggling enableAi back on restores the previously remembered configuration in-session', () => {
    const settingsClient = buildSettingsClient({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'pre-1',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: true,
    });
    mockUseKibana.mockReturnValue({
      services: { settings: { client: settingsClient }, notifications: buildNotifications() },
    });

    const { result } = renderHook(() => useDefaultModelSettings());

    act(() => {
      result.current.setEnableAi(false);
    });
    act(() => {
      result.current.setEnableAi(true);
    });

    expect(result.current.state).toEqual({
      enableAi: true,
      defaultModelId: 'pre-1',
      featureSpecificModels: false,
    });
  });

  it('toggling enableAi on from an opted-out initial state yields an empty selection', () => {
    const settingsClient = buildSettingsClient({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: NO_DEFAULT_MODEL,
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: true,
    });
    mockUseKibana.mockReturnValue({
      services: { settings: { client: settingsClient }, notifications: buildNotifications() },
    });

    const { result } = renderHook(() => useDefaultModelSettings());

    act(() => {
      result.current.setEnableAi(true);
    });

    expect(result.current.state).toEqual({
      enableAi: true,
      defaultModelId: NO_DEFAULT_MODEL,
      featureSpecificModels: true,
    });
  });

  it('save() writes only changed underlying settings (featureSpecificModels off persists disallow=true)', async () => {
    const settingsClient = buildSettingsClient({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'pre-1',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
    });
    const notifications = buildNotifications();
    mockUseKibana.mockReturnValue({
      services: { settings: { client: settingsClient }, notifications },
    });

    const { result } = renderHook(() => useDefaultModelSettings());

    act(() => {
      result.current.setFeatureSpecificModels(false);
    });

    await act(async () => {
      await result.current.save();
    });

    expect(settingsClient.set).toHaveBeenCalledTimes(1);
    expect(settingsClient.set).toHaveBeenCalledWith(
      GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
      true
    );
    expect(notifications.toasts.addSuccess).toHaveBeenCalled();
    expect(result.current.isDirty).toBe(false);
  });

  it('save() with enableAi turned off persists both underlying settings', async () => {
    const settingsClient = buildSettingsClient({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'pre-1',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
    });
    const notifications = buildNotifications();
    mockUseKibana.mockReturnValue({
      services: { settings: { client: settingsClient }, notifications },
    });

    const { result } = renderHook(() => useDefaultModelSettings());

    act(() => {
      result.current.setEnableAi(false);
    });

    await act(async () => {
      await result.current.save();
    });

    expect(settingsClient.set).toHaveBeenCalledWith(
      GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
      NO_DEFAULT_MODEL
    );
    expect(settingsClient.set).toHaveBeenCalledWith(
      GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
      true
    );
    expect(result.current.state.enableAi).toBe(false);
    expect(result.current.isDirty).toBe(false);
  });

  it('reset() discards unsaved changes', () => {
    const settingsClient = buildSettingsClient({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'pre-1',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
    });
    mockUseKibana.mockReturnValue({
      services: { settings: { client: settingsClient }, notifications: buildNotifications() },
    });

    const { result } = renderHook(() => useDefaultModelSettings());

    act(() => {
      result.current.setEnableAi(false);
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.state.enableAi).toBe(true);
  });

  it('save() calls addDanger and leaves isDirty true when settingsClient.set throws', async () => {
    const settingsClient = buildSettingsClient({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'pre-1',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
    });
    const notifications = buildNotifications();
    settingsClient.set.mockRejectedValueOnce(new Error('Network error'));
    mockUseKibana.mockReturnValue({
      services: { settings: { client: settingsClient }, notifications },
    });

    const { result } = renderHook(() => useDefaultModelSettings());

    act(() => {
      result.current.setEnableAi(false);
    });

    await act(async () => {
      await expect(result.current.save()).rejects.toThrow('Network error');
    });

    expect(notifications.toasts.addDanger).toHaveBeenCalled();
    expect(result.current.isDirty).toBe(true);
  });

  it('save() with FSM on writes NO_DEFAULT_MODEL when the global default is cleared', async () => {
    const settingsClient = buildSettingsClient({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'pre-1',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
    });
    const notifications = buildNotifications();
    mockUseKibana.mockReturnValue({
      services: { settings: { client: settingsClient }, notifications },
    });

    const { result } = renderHook(() => useDefaultModelSettings());

    act(() => {
      result.current.setDefaultModelId(NO_DEFAULT_MODEL);
    });

    await act(async () => {
      await result.current.save();
    });

    expect(settingsClient.set).toHaveBeenCalledTimes(1);
    expect(settingsClient.set).toHaveBeenCalledWith(
      GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
      NO_DEFAULT_MODEL
    );
    expect(result.current.state.enableAi).toBe(true);
    expect(result.current.state.featureSpecificModels).toBe(true);
    expect(result.current.isDirty).toBe(false);
    expect(notifications.toasts.addSuccess).toHaveBeenCalled();
  });

  it('subscription re-derives savedState when an external settings change fires', async () => {
    const settingsClient = buildSettingsClient({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'pre-1',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
    });
    mockUseKibana.mockReturnValue({
      services: { settings: { client: settingsClient }, notifications: buildNotifications() },
    });

    const { result } = renderHook(() => useDefaultModelSettings());

    expect(result.current.isDirty).toBe(false);

    await act(async () => {
      await settingsClient.set(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR, 'externally-updated');
    });

    // Local state is unchanged — user has not touched the form.
    expect(result.current.state.defaultModelId).toBe('pre-1');
    // savedState was re-derived from the store, so the form now shows as dirty.
    expect(result.current.isDirty).toBe(true);
  });
});
