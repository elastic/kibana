/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { DeploymentMethod } from '@kbn/fleet-plugin/public';

/**
 * Package policy fields from the Service settings step that every package policy of the onboarding
 * gets, keyed by their Fleet field name so they can be sent as they are. An empty value means the
 * Fleet default (for the output, the one inherited from the agent policy).
 */
export interface PolicySettings {
  output_id?: string;
  /** A package var (`vars.proxy_url`), not a top-level package policy field. */
  proxy_url?: string;
  /** Extra data stream names the policy may write to (the reroute processor permissions). */
  additional_datastreams_permissions?: string[];
}

type PolicySettingKey = keyof PolicySettings;

/** The settings as Step 2 holds them, or as the saved object stores them (an open record). */
type PolicySettingsSource = PolicySettings | Record<string, unknown> | undefined;

const isString = (value: unknown): boolean => typeof value === 'string';
const isStringArray = (value: unknown): boolean =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/**
 * The deployment methods each setting applies to, and what a value must look like. Managed
 * integrations go through Fleet's agentless policy API, which accepts fewer fields than a package
 * policy (no `output_id` or `condition`), so a setting may list it only when that API takes the
 * field. The saved object is an open record, so a value read back from it is checked here before it
 * reaches a Fleet request body, where a wrong type would fail with a generic validation error.
 *
 * `target` is where the value goes in the request: a top-level field of the package policy
 * (`field`), or a package-level var of the package that declares it (`var`).
 */
const POLICY_SETTINGS: Record<
  PolicySettingKey,
  {
    methods: DeploymentMethod[];
    target: 'field' | 'var';
    isValid: (value: unknown) => boolean;
    /** What an update sends to clear the setting. Both Fleet APIs take an empty list, not null. */
    cleared?: unknown;
  }
> = {
  output_id: { methods: ['agent_based'], target: 'field', isValid: isString },
  proxy_url: { methods: ['agent_based', 'managed_integration'], target: 'var', isValid: isString },
  additional_datastreams_permissions: {
    methods: ['agent_based', 'managed_integration'],
    target: 'field',
    isValid: isStringArray,
    cleared: [],
  },
};

const isEmptySetting = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

/**
 * Strings are trimmed (Step 2 keeps what was typed, so a space typed mid-edit is not eaten). In a
 * list, each entry is trimmed and blank or repeated ones are dropped, so the same permissions
 * compare equal however they were entered. A list with a non-string entry is left as it is for
 * `isValid` to reject.
 */
const normalizeSetting = (value: unknown): unknown => {
  if (typeof value === 'string') return value.trim();
  if (isStringArray(value)) {
    return [...new Set((value as string[]).map((item) => item.trim()).filter(Boolean))];
  }
  return value;
};

const getKeys = (method: DeploymentMethod, target?: 'field' | 'var'): PolicySettingKey[] =>
  (Object.keys(POLICY_SETTINGS) as PolicySettingKey[]).filter(
    (key) =>
      POLICY_SETTINGS[key].methods.includes(method) &&
      (!target || POLICY_SETTINGS[key].target === target)
  );

/** Whether a setting applies to the deployment method, which decides whether Step 2 offers it. */
export const supportsPolicySetting = (key: PolicySettingKey, method: DeploymentMethod): boolean =>
  POLICY_SETTINGS[key].methods.includes(method);

/**
 * The settings with a value, as the saved object stores them. Values are normalized (see
 * `normalizeSetting`) and empty ones are left out, so an
 * onboarding saved before a setting existed reads the same as one where it was left at its default.
 */
export const compactPolicySettings = (settings: PolicySettingsSource): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(settings ?? {})
      .map(([key, value]) => [key, normalizeSetting(value)])
      .filter(([, value]) => !isEmptySetting(value))
  );

const pickSettings = (settings: PolicySettingsSource, keys: PolicySettingKey[]): PolicySettings => {
  const compact = compactPolicySettings(settings);
  return Object.fromEntries(
    keys.flatMap((key) =>
      key in compact && POLICY_SETTINGS[key].isValid(compact[key]) ? [[key, compact[key]]] : []
    )
  ) as PolicySettings;
};

/**
 * The top-level package policy fields a new policy of the deployment method gets. An empty one is
 * left to Fleet. Settings that are package vars are returned by `getPolicyVarSettings`.
 */
export const getPolicySettings = (
  settings: PolicySettingsSource,
  method: DeploymentMethod
): Pick<PolicySettings, 'output_id' | 'additional_datastreams_permissions'> =>
  pickSettings(settings, getKeys(method, 'field'));

/**
 * The var settings a new policy gets, only for the vars the package declares: Fleet rejects a var
 * the package does not have. Without `pkgVarNames` nothing is filtered, for a caller that checks
 * the declaration itself (stream-level vars).
 */
export const getPolicyVarSettings = (
  settings: PolicySettingsSource,
  method: DeploymentMethod,
  pkgVarNames?: Set<string>
): Record<string, string> =>
  pickSettings(
    settings,
    getKeys(method, 'var').filter((key) => !pkgVarNames || pkgVarNames.has(key))
  ) as Record<string, string>;

/**
 * The settings an update of a deployed policy sends. A setting set back to empty is sent as its
 * cleared value (`null`, or an empty list for a list), which clears the value the policy has; one never set, or with an invalid value, is left out, so
 * the policy keeps its own.
 */
const pickSettingsUpdate = (
  settings: PolicySettingsSource,
  keys: PolicySettingKey[]
): Record<string, unknown> =>
  Object.fromEntries(
    keys.flatMap((key) => {
      const raw = (settings as Record<string, unknown> | undefined)?.[key];
      const value = normalizeSetting(raw);
      if (value === undefined) return [];
      if (isEmptySetting(value)) return [[key, POLICY_SETTINGS[key].cleared ?? null]];
      return POLICY_SETTINGS[key].isValid(value) ? [[key, value]] : [];
    })
  );

export const getPolicySettingsUpdate = (
  settings: PolicySettingsSource,
  method: DeploymentMethod
): Record<string, unknown> => pickSettingsUpdate(settings, getKeys(method, 'field'));

/**
 * The package-level vars an update sends, for the vars the package declares. Cleared ones are
 * `null`, like `getPolicySettingsUpdate`.
 */
export const getPolicyVarSettingsUpdate = (
  settings: PolicySettingsSource,
  method: DeploymentMethod,
  pkgVarNames: Set<string>
): Record<string, string | null> =>
  pickSettingsUpdate(
    settings,
    getKeys(method, 'var').filter((key) => pkgVarNames.has(key))
  ) as Record<string, string | null>;

/**
 * Whether the settings that apply to the deployment method differ from the ones saved with the
 * last deploy. Settings of other methods are ignored, so one left over from a method switch does
 * not mark the deployment dirty.
 */
export const detectPolicySettingsDrift = (
  current: PolicySettingsSource,
  saved: PolicySettingsSource,
  method: DeploymentMethod
): boolean =>
  !isEqual(pickSettings(current, getKeys(method)), pickSettings(saved, getKeys(method)));
