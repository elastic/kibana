/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOnboardingSessionKey } from './onboarding_session_storage';

/** App to land on when cancelling a flow that was not opened with a return URL. */
export const DEFAULT_RETURN_APP = 'integrations';

/**
 * Remembers the page the flow was opened from, so cancelling can take the user back to it.
 * It lives in session storage because the navigation state that carries it is consumed on
 * mount, and the wizard must survive a reload.
 */
export function saveReturnUrl(integrationId: string, url: string): void {
  try {
    sessionStorage.setItem(getOnboardingSessionKey(integrationId, 'returnUrl'), url);
  } catch {
    // sessionStorage unavailable (private mode, quota exceeded, etc.) — cancelling falls back
    // to the default app.
  }
}

/**
 * The stored return URL, or undefined when there is none or it points off this origin. The URL
 * is only ever set by in-app callers, the origin check keeps it that way.
 */
export function getReturnUrl(integrationId: string): string | undefined {
  try {
    const url = sessionStorage.getItem(getOnboardingSessionKey(integrationId, 'returnUrl'));
    if (!url) return undefined;
    return new URL(url, window.location.origin).origin === window.location.origin ? url : undefined;
  } catch {
    return undefined;
  }
}
