/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { observabilityAgentId } from '@kbn/agent-builder-common';

/** Dispatched on the window after the Nightshift preference is written (same-tab listeners). */
export const OBSERVABILITY_NIGHTSHIFT_SETTING_CHANGED = 'agentBuilderObservabilityNightshiftChanged';

/**
 * Single key for the built-in Observability agent so overview and chat always agree
 * (route/context agent id strings can differ).
 */
export const OBSERVABILITY_NIGHTSHIFT_LOCAL_STORAGE_KEY = `agentBuilder.observabilityNightshift.enabled:${observabilityAgentId}`;

/**
 * Whether the Observability Nightshift empty-state (blast radius, etc.) is shown for new chats.
 * Defaults to `true` so behavior matches the pre-setting experience.
 */
export const readObservabilityNightshiftEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    return true;
  }
  try {
    const raw = window.localStorage.getItem(OBSERVABILITY_NIGHTSHIFT_LOCAL_STORAGE_KEY);
    if (raw === null) {
      return true;
    }
    return raw === 'true';
  } catch {
    return true;
  }
};

export const writeObservabilityNightshiftEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(
      OBSERVABILITY_NIGHTSHIFT_LOCAL_STORAGE_KEY,
      enabled ? 'true' : 'false'
    );
    window.dispatchEvent(new Event(OBSERVABILITY_NIGHTSHIFT_SETTING_CHANGED));
  } catch {
    // ignore quota / privacy errors
  }
};
