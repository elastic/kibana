/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Keep this list in sync with every useSessionStorage call that uses getOnboardingSessionKey.
export const SESSION_KEY_SUFFIXES = [
  'authenticateAndDeployStep',
  'servicesStep',
  'detectAndReviewStep',
  'serviceSettingsStep',
  'stepState',
  'ecfLaunchStep',
] as const;

export type SessionKeySuffix = (typeof SESSION_KEY_SUFFIXES)[number];

export function getOnboardingSessionKey(integrationId: string, suffix: SessionKeySuffix): string {
  return `onboarding.${integrationId}.${suffix}`;
}

export function getOnboardingSessionKeys(integrationId: string): string[] {
  return SESSION_KEY_SUFFIXES.map((suffix) => getOnboardingSessionKey(integrationId, suffix));
}

export function clearOnboardingSession(integrationId: string): void {
  try {
    const keys = getOnboardingSessionKeys(integrationId);
    keys.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // sessionStorage unavailable (private mode, quota exceeded, etc.) — silently no-op
  }
}
