/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Top-level agent policy keys that can never be set through `overrides`.
 */
export const DENIED_AGENT_POLICY_OVERRIDE_KEYS = [
  'inputs',
  'output_permissions',
  'receivers',
  'exporters',
  'processors',
  'connectors',
  'extensions',
  'service',
] as const;

/**
 * The agent expands dotted keys (`service.pipelines`) into nested ones, so a key is denied when it
 * is exactly a denied key or a dotted path below it.
 */
export function getDeniedAgentPolicyOverrideKey(key: string): string | undefined {
  return DENIED_AGENT_POLICY_OVERRIDE_KEYS.find(
    (denied) => key === denied || key.startsWith(`${denied}.`)
  );
}

/** Returns a copy of `overrides` without denied keys, and the list of keys that were removed. */
export function sanitizeAgentPolicyOverrides(overrides: Record<string, any>): {
  overrides: Record<string, any>;
  removedKeys: string[];
} {
  const removedKeys: string[] = [];
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(overrides)) {
    if (getDeniedAgentPolicyOverrideKey(key)) {
      removedKeys.push(key);
    } else {
      sanitized[key] = value;
    }
  }
  return { overrides: sanitized, removedKeys };
}
