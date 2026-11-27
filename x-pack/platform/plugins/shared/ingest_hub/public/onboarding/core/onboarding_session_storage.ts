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
  'hydratedDeploymentId',
  'returnUrl',
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

const sessionsToDiscard = new Set<string>();

/**
 * Marks a session to be cleared once the app has unmounted. Clearing it right away is not enough:
 * the mounted persistence hooks (`useSessionStorage`) write their state back on the next render,
 * which still happens before navigation unmounts the app.
 */
export function discardSessionOnUnmount(integrationId: string): void {
  sessionsToDiscard.add(integrationId);
}

/** Clears the sessions marked by `discardSessionOnUnmount`. Call it after the app has unmounted. */
export function discardMarkedSessions(): void {
  sessionsToDiscard.forEach(clearOnboardingSession);
  sessionsToDiscard.clear();
}
