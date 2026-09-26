/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { aiAnonymizationSettings, DEFAULT_BUILTIN_REGEX_RULES } from '@kbn/inference-common';
import { useAnonymizationSettings } from './use_anonymization_settings';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana', () => ({
  useKibana: jest.fn(),
}));

const DEFAULT_SETTINGS_JSON = JSON.stringify({
  maskingEnabled: false,
  onFailure: 'block',
  rules: [],
});

/**
 * Mimics the parts of Kibana core's real `IUiSettingsClient` behavior for `type: 'json'`
 * settings that this hook depends on: `get()` always `JSON.parse()`s the stored value and
 * falls back to the raw (string) schema default when that throws, while `set()` persists
 * whatever it's given verbatim with no normalization — exactly like core's
 * `UiSettingsClient#update()`, which sends its raw argument to the server via `batchSet()`
 * and then re-hydrates the local cache from the server's echo of it, rather than reusing
 * `setLocally()`'s stringified value. Passing a non-string to `set()` therefore breaks the
 * *next* `get()` call (including after a real page reload, which rehydrates from a fresh
 * server-rendered payload with the same object-shaped `userValue`).
 */
class FakeJsonUiSettingsClient {
  private userValue: unknown;

  constructor(private readonly defaultValue: string) {}

  get = jest.fn((): unknown => {
    const value = this.userValue ?? this.defaultValue;
    try {
      if (typeof value === 'string' && value.trim() === '') {
        return this.defaultValue;
      }
      return JSON.parse(value as string);
    } catch {
      return this.defaultValue;
    }
  });

  set = jest.fn(async (_key: string, newValue: unknown): Promise<boolean> => {
    this.userValue = newValue;
    return true;
  });
}

describe('useAnonymizationSettings', () => {
  let client: FakeJsonUiSettingsClient;
  let addDanger: jest.Mock;

  beforeEach(() => {
    client = new FakeJsonUiSettingsClient(DEFAULT_SETTINGS_JSON);
    addDanger = jest.fn();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        settings: { client },
        notifications: { toasts: { addDanger } },
      },
    });
  });

  it('persists a JSON string (not a raw object) so the setting survives a reload', async () => {
    const { result } = renderHook(() => useAnonymizationSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setMaskingEnabled(true);
    });

    // Passing the raw object here is exactly what causes `IUiSettingsClient#get()` to throw
    // internally on the next read and silently fall back to the masking-off default — this
    // is the regression this test guards against.
    expect(client.set).toHaveBeenCalledWith(aiAnonymizationSettings, expect.any(String));
    const persisted = JSON.parse((client.set as jest.Mock).mock.calls[0][1]);
    expect(persisted.maskingEnabled).toBe(true);

    // Simulate a fresh page load: re-mount the hook against the same underlying client,
    // which now reads back from whatever `set()` actually stored — just like a real reload
    // reading from a freshly-hydrated cache.
    const { result: afterReload } = renderHook(() => useAnonymizationSettings());
    await waitFor(() => expect(afterReload.current.isLoading).toBe(false));
    expect(afterReload.current.maskingEnabled).toBe(true);
  });

  it('reverts local state and shows a toast when persisting fails', async () => {
    client.set = jest.fn().mockRejectedValueOnce(new Error('nope'));
    const { result } = renderHook(() => useAnonymizationSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setMaskingEnabled(true);
    });

    expect(result.current.maskingEnabled).toBe(false);
    expect(addDanger).toHaveBeenCalled();
  });

  it('refreshes a stale persisted built-in pattern to the current code-level default on load', async () => {
    // Simulates an environment that saved `ai:anonymizationSettings` before a built-in
    // pattern was fixed in code: the persisted rule keeps its old, now-stale `pattern`,
    // which must not reach the UI (or the pipeline) as-is.
    const hostNameDefault = DEFAULT_BUILTIN_REGEX_RULES.find(
      (rule) => rule.id === 'builtin-host-name'
    )!;
    const staleHostNameRule = {
      ...hostNameDefault,
      pattern: 'this-is-a-stale-pattern',
      enabled: false,
    };
    client = new FakeJsonUiSettingsClient(
      JSON.stringify({
        maskingEnabled: true,
        onFailure: 'block',
        rules: [staleHostNameRule],
      })
    );
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        settings: { client },
        notifications: { toasts: { addDanger } },
      },
    });

    const { result } = renderHook(() => useAnonymizationSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const hostNameRule = result.current.builtInPatterns.find(
      (rule) => rule.id === 'builtin-host-name'
    );
    expect(hostNameRule?.pattern).toBe(hostNameDefault.pattern);
    // The persisted `enabled` state must still be honored even though the pattern was refreshed.
    expect(hostNameRule?.enabled).toBe(false);
  });
});
