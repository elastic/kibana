/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { aiAnonymizationSettings, DEFAULT_BUILTIN_REGEX_RULES } from '@kbn/ai-anonymization-common';
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

  // The pipeline resolves same-position overlaps by rule order, and settings saved before built-ins
  // existed keep their custom rules first. The tester must use that order, not built-ins first.
  it('lists the enabled rules in persisted order, even when a custom rule precedes a built-in one', async () => {
    const customRule = {
      type: 'RegExp',
      id: 'custom-1',
      name: 'Custom',
      entityClass: 'MISC',
      pattern: 'abc',
      enabled: true,
      builtIn: false,
    };
    const builtInRule = { ...DEFAULT_BUILTIN_REGEX_RULES[0], enabled: true };
    client = new FakeJsonUiSettingsClient(
      JSON.stringify({ maskingEnabled: true, onFailure: 'block', rules: [customRule, builtInRule] })
    );
    (useKibana as jest.Mock).mockReturnValue({
      services: { settings: { client }, notifications: { toasts: { addDanger } } },
    });

    const { result } = renderHook(() => useAnonymizationSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.enabledRules.map((rule) => rule.id)).toEqual([
      'custom-1',
      builtInRule.id,
    ]);
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

  it('reverts local state and reports failure when core resolves false instead of rejecting', async () => {
    // Core's UiSettingsClient#update() catches a failed write and returns false (after showing
    // its own error toast), so the hook's catch block never runs for it.
    client.set = jest.fn().mockResolvedValueOnce(false);
    const { result } = renderHook(() => useAnonymizationSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let isSaved: boolean | undefined;
    await act(async () => {
      isSaved = await result.current.setMaskingEnabled(true);
    });

    expect(isSaved).toBe(false);
    expect(result.current.maskingEnabled).toBe(false);
    expect(addDanger).not.toHaveBeenCalled();
  });

  it('reports success when the write is saved', async () => {
    const { result } = renderHook(() => useAnonymizationSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let isSaved: boolean | undefined;
    await act(async () => {
      isSaved = await result.current.setMaskingEnabled(true);
    });

    expect(isSaved).toBe(true);
    expect(result.current.maskingEnabled).toBe(true);
  });

  describe('custom pattern workflow', () => {
    // A fresh mount against the same client is what a page reload does: it reads back only what
    // `set()` actually stored.
    const reload = async () => {
      const hook = renderHook(() => useAnonymizationSettings());
      await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
      return hook.result;
    };

    const newPattern = {
      name: 'Employee ID',
      entityClass: 'URL' as const,
      pattern: 'EMP-\\d+',
      enabled: true,
    };

    it('saves a new custom pattern through the settings client and keeps it after a reload', async () => {
      const { result } = renderHook(() => useAnonymizationSettings());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.addCustomPattern(newPattern);
      });

      const stored = JSON.parse((client.set as jest.Mock).mock.calls[0][1]).rules;
      expect(stored).toContainEqual(
        expect.objectContaining({ ...newPattern, id: expect.any(String), builtIn: false })
      );
      const afterReload = await reload();
      expect(afterReload.current.customPatterns).toEqual([expect.objectContaining(newPattern)]);
    });

    it('updates a custom pattern in place and keeps the edit after a reload', async () => {
      const { result } = renderHook(() => useAnonymizationSettings());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => {
        await result.current.addCustomPattern(newPattern);
      });
      const [{ id }] = result.current.customPatterns;

      await act(async () => {
        await result.current.updateCustomPattern(id as string, {
          ...newPattern,
          pattern: 'EMP-\\d{4}',
          enabled: false,
        });
      });

      const afterReload = await reload();
      expect(afterReload.current.customPatterns).toEqual([
        expect.objectContaining({ id, pattern: 'EMP-\\d{4}', enabled: false }),
      ]);
    });

    it('removes a custom pattern and keeps it removed after a reload', async () => {
      const { result } = renderHook(() => useAnonymizationSettings());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => {
        await result.current.addCustomPattern(newPattern);
      });
      const [{ id }] = result.current.customPatterns;

      await act(async () => {
        await result.current.deleteCustomPattern(id as string);
      });

      const afterReload = await reload();
      expect(afterReload.current.customPatterns).toEqual([]);
    });

    it('does not keep a custom pattern that failed to save, including after a reload', async () => {
      const { result } = renderHook(() => useAnonymizationSettings());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      // Core resolves false for a failed write and leaves the stored value unchanged.
      client.set = jest.fn().mockResolvedValue(false);

      let isSaved: boolean | undefined;
      await act(async () => {
        isSaved = await result.current.addCustomPattern(newPattern);
      });

      expect(isSaved).toBe(false);
      expect(result.current.customPatterns).toEqual([]);
      const afterReload = await reload();
      expect(afterReload.current.customPatterns).toEqual([]);
    });
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

  it('shows masking as on and enables no new built-in for settings saved before the master switch existed', async () => {
    // Shape persisted by earlier releases: no `maskingEnabled`, no `id`/`builtIn`, EMAIL enabled.
    client = new FakeJsonUiSettingsClient(
      JSON.stringify({
        rules: [
          {
            type: 'RegExp',
            entityClass: 'EMAIL',
            pattern: '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
            enabled: true,
          },
        ],
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

    // The server keeps masking for this value, so the switch must not claim it is off.
    expect(result.current.maskingEnabled).toBe(true);
    expect(result.current.builtInPatterns).toHaveLength(DEFAULT_BUILTIN_REGEX_RULES.length);
    expect(result.current.builtInPatterns.filter(({ enabled }) => enabled)).toEqual([]);
  });

  describe('rules saved before rules had ids', () => {
    const legacyRule = {
      type: 'RegExp',
      entityClass: 'MISC',
      pattern: 'EMP-\\d+',
      enabled: true,
    };

    const loadLegacySettings = async () => {
      client = new FakeJsonUiSettingsClient(JSON.stringify({ rules: [legacyRule] }));
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          settings: { client },
          notifications: { toasts: { addDanger } },
        },
      });
      const hook = renderHook(() => useAnonymizationSettings());
      await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
      return hook;
    };

    const persistedRules = () => JSON.parse((client.set as jest.Mock).mock.calls[0][1]).rules;

    it('gives the rule an id so it can be toggled, which persists the id', async () => {
      const { result } = await loadLegacySettings();
      const [custom] = result.current.customPatterns;
      expect(custom.id).toEqual(expect.any(String));

      await act(async () => {
        await result.current.setRuleEnabled(custom.id as string, false);
      });

      expect(result.current.customPatterns).toEqual([
        expect.objectContaining({ id: custom.id, enabled: false }),
      ]);
      expect(
        persistedRules().find(({ pattern }: { pattern: string }) => pattern === 'EMP-\\d+')
      ).toEqual(expect.objectContaining({ id: custom.id, enabled: false }));
    });

    it('updates the rule in place instead of adding a second one', async () => {
      const { result } = await loadLegacySettings();
      const [custom] = result.current.customPatterns;

      await act(async () => {
        await result.current.updateCustomPattern(custom.id as string, {
          name: 'Employee ID',
          entityClass: 'URL',
          pattern: 'EMP-\\d{4}',
          enabled: true,
        });
      });

      expect(result.current.customPatterns).toHaveLength(1);
      expect(result.current.customPatterns[0]).toEqual(
        expect.objectContaining({ id: custom.id, name: 'Employee ID', pattern: 'EMP-\\d{4}' })
      );
    });

    it('deletes the rule', async () => {
      const { result } = await loadLegacySettings();
      const [custom] = result.current.customPatterns;
      expect(custom.id).toEqual(expect.any(String));

      await act(async () => {
        await result.current.deleteCustomPattern(custom.id as string);
      });

      expect(result.current.customPatterns).toEqual([]);
      expect(
        persistedRules().some(({ pattern }: { pattern: string }) => pattern === 'EMP-\\d+')
      ).toBe(false);
    });
  });
});
