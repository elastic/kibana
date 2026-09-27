/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import { aiAnonymizationSettings, refreshBuiltInAnonymizationRules } from '@kbn/inference-common';
import type {
  AnonymizationFailureMode,
  AnonymizationRule,
  AnonymizationSettings,
  RegexAnonymizationRule,
} from '@kbn/inference-common';
import type { CustomPatternEntityClass } from '../lib/entity_classes';
import { useKibana } from './use_kibana';

const DEFAULT_SETTINGS: AnonymizationSettings = {
  maskingEnabled: false,
  onFailure: 'block',
  rules: [],
};

const isRegexRule = (rule: AnonymizationRule): rule is RegexAnonymizationRule =>
  rule.type === 'RegExp';

const parseSettings = (raw: unknown): AnonymizationSettings => {
  // The `type: 'json'` uiSetting is already parsed into an object by IUiSettingsClient#get,
  // but be defensive in case a caller ever hands us the raw stored string.
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as any).rules)) {
    return DEFAULT_SETTINGS;
  }
  const settings = parsed as AnonymizationSettings;
  // The persisted value freezes each built-in rule's `pattern` as of whenever it was last
  // saved, so a later code-level fix to a built-in pattern would otherwise never reach this
  // page for an environment that already saved settings once — refresh every built-in rule's
  // definition from current code, keeping only its persisted `enabled` state. See
  // `refreshBuiltInAnonymizationRules`'s doc comment for the full rationale.
  return { ...settings, rules: refreshBuiltInAnonymizationRules(settings.rules) };
};

export interface NewCustomPattern {
  name: string;
  entityClass: CustomPatternEntityClass;
  pattern: string;
  enabled: boolean;
}

/**
 * Loads, mutates and persists the `ai:anonymizationSettings` advanced setting for the
 * Anonymization Settings management page. Every mutator persists immediately (no separate
 * save step), reverting local state and surfacing a toast if the write fails.
 *
 * NER rules are intentionally left untouched by every mutator here: they are never rendered
 * or edited from this page, only carried through unchanged.
 */
export function useAnonymizationSettings() {
  const {
    services: { settings, notifications },
  } = useKibana();

  const [value, setValue] = useState<AnonymizationSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(() => {
    const raw = settings.client.get<unknown>(aiAnonymizationSettings);
    setValue(parseSettings(raw));
  }, [settings]);

  useEffect(() => {
    reload();
    setIsLoading(false);
  }, [reload]);

  const persist = useCallback(
    async (next: AnonymizationSettings) => {
      const previous = value;
      setValue(next);
      try {
        // `settings.client`'s `update()` sends whatever we pass here verbatim to the server
        // and then overwrites the local cache with the server's echo of it — it does NOT
        // apply the same "stringify non-string json-type values" normalization that
        // `setLocally()` uses for the optimistic local cache update. Passing the raw object
        // therefore persists (and gets echoed back into cache, including on a later page
        // load) as an object rather than a JSON string. `IUiSettingsClient#get()` always
        // does `JSON.parse(userValue)` for `type: 'json'` settings, which throws on an
        // object, and silently falls back to the schema default (masking off) — so the
        // toggle appears to revert after a reload even though the raw value did persist.
        // Sending the string ourselves keeps every representation (local cache, server
        // storage, next reload's bootstrap payload) consistently a JSON string.
        await settings.client.set(aiAnonymizationSettings, JSON.stringify(next));
      } catch (e) {
        setValue(previous);
        notifications.toasts.addDanger({
          title: i18n.translate('xpack.aiAnonymizationSettings.save.error', {
            defaultMessage: 'An error occurred while saving the settings',
          }),
          text: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [settings, notifications, value]
  );

  const regexRules = useMemo(() => value.rules.filter(isRegexRule), [value.rules]);
  const builtInPatterns = useMemo(() => regexRules.filter((rule) => rule.builtIn), [regexRules]);
  const customPatterns = useMemo(() => regexRules.filter((rule) => !rule.builtIn), [regexRules]);

  const setMaskingEnabled = useCallback(
    (maskingEnabled: boolean) => persist({ ...value, maskingEnabled }),
    [persist, value]
  );

  const setOnFailure = useCallback(
    (onFailure: AnonymizationFailureMode) => persist({ ...value, onFailure }),
    [persist, value]
  );

  const setRuleEnabled = useCallback(
    (id: string, enabled: boolean) =>
      persist({
        ...value,
        rules: value.rules.map((rule) =>
          isRegexRule(rule) && rule.id === id ? { ...rule, enabled } : rule
        ),
      }),
    [persist, value]
  );

  const addCustomPattern = useCallback(
    (pattern: NewCustomPattern) =>
      persist({
        ...value,
        rules: [
          ...value.rules,
          {
            type: 'RegExp',
            id: uuidv4(),
            builtIn: false,
            ...pattern,
          },
        ],
      }),
    [persist, value]
  );

  const updateCustomPattern = useCallback(
    (id: string, patch: NewCustomPattern) =>
      persist({
        ...value,
        rules: value.rules.map((rule) =>
          isRegexRule(rule) && rule.id === id ? { ...rule, ...patch } : rule
        ),
      }),
    [persist, value]
  );

  const deleteCustomPattern = useCallback(
    (id: string) =>
      persist({
        ...value,
        rules: value.rules.filter((rule) => !(isRegexRule(rule) && rule.id === id)),
      }),
    [persist, value]
  );

  return {
    isLoading,
    maskingEnabled: value.maskingEnabled ?? false,
    onFailure: value.onFailure ?? 'block',
    builtInPatterns,
    customPatterns,
    setMaskingEnabled,
    setOnFailure,
    setRuleEnabled,
    addCustomPattern,
    updateCustomPattern,
    deleteCustomPattern,
  };
}
