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
}

type PolicySettingKey = keyof PolicySettings;

/** The settings as Step 2 holds them, or as the saved object stores them (an open record). */
type PolicySettingsSource = PolicySettings | Record<string, unknown> | undefined;

/**
 * The deployment methods each setting applies to, and what a value must look like. Managed
 * integrations go through Fleet's agentless policy API, which accepts fewer fields than a package
 * policy (no `output_id` or `condition`), so a setting may list it only when that API takes the
 * field. The saved object is an open record, so a value read back from it is checked here before it
 * reaches a Fleet request body, where a wrong type would fail with a generic validation error.
 */
const POLICY_SETTINGS: Record<
  PolicySettingKey,
  { methods: DeploymentMethod[]; isValid: (value: unknown) => boolean }
> = {
  output_id: { methods: ['agent_based'], isValid: (value) => typeof value === 'string' },
};

const isEmptySetting = (value: unknown): boolean =>
  value === undefined || value === null || value === '';

const getKeys = (method: DeploymentMethod): PolicySettingKey[] =>
  (Object.keys(POLICY_SETTINGS) as PolicySettingKey[]).filter((key) =>
    POLICY_SETTINGS[key].methods.includes(method)
  );

/** Whether a setting applies to the deployment method, which decides whether Step 2 offers it. */
export const supportsPolicySetting = (key: PolicySettingKey, method: DeploymentMethod): boolean =>
  POLICY_SETTINGS[key].methods.includes(method);

/**
 * The settings with a value, as the saved object stores them. Empty ones are left out, so an
 * onboarding saved before a setting existed reads the same as one where it was left at its default.
 */
export const compactPolicySettings = (settings: PolicySettingsSource): Record<string, unknown> =>
  Object.fromEntries(Object.entries(settings ?? {}).filter(([, value]) => !isEmptySetting(value)));

/** The settings a new policy of the deployment method gets. An empty one is left to Fleet. */
export const getPolicySettings = (
  settings: PolicySettingsSource,
  method: DeploymentMethod
): PolicySettings => {
  const compact = compactPolicySettings(settings);
  return Object.fromEntries(
    getKeys(method).flatMap((key) =>
      key in compact && POLICY_SETTINGS[key].isValid(compact[key]) ? [[key, compact[key]]] : []
    )
  ) as PolicySettings;
};

/**
 * The settings an update of a deployed policy sends. A setting set back to empty is sent as `null`,
 * which clears the value the policy has; one never set, or with an invalid value, is left out, so
 * the policy keeps its own.
 */
export const getPolicySettingsUpdate = (
  settings: PolicySettingsSource,
  method: DeploymentMethod
): Record<string, unknown> =>
  Object.fromEntries(
    getKeys(method).flatMap((key) => {
      const value = (settings as Record<string, unknown> | undefined)?.[key];
      if (value === undefined) return [];
      if (isEmptySetting(value)) return [[key, null]];
      return POLICY_SETTINGS[key].isValid(value) ? [[key, value]] : [];
    })
  );

/**
 * Whether the settings that apply to the deployment method differ from the ones saved with the
 * last deploy. Settings of other methods are ignored, so one left over from a method switch does
 * not mark the deployment dirty.
 */
export const detectPolicySettingsDrift = (
  current: PolicySettingsSource,
  saved: PolicySettingsSource,
  method: DeploymentMethod
): boolean => !isEqual(getPolicySettings(current, method), getPolicySettings(saved, method));
