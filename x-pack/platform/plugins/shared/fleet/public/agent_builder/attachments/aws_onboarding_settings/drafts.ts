/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useSyncExternalStore } from 'react';

import type { AwsOnboardingSettingsAnswer } from '../../../../common/workflows/steps/settings';

// The inline card and the canvas form render in separate React roots, so the draft they edit
// lives here, keyed by attachment, rather than in component state.
const drafts = new Map<string, AwsOnboardingSettingsAnswer>();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const clearSettingsDraft = (attachmentId: string) => {
  if (drafts.delete(attachmentId)) notify();
};

/** The shared draft for an attachment; `seed` runs only when no draft exists yet. */
export const useSettingsDraft = (
  attachmentId: string,
  seed: () => AwsOnboardingSettingsAnswer
): [AwsOnboardingSettingsAnswer, (draft: AwsOnboardingSettingsAnswer) => void] => {
  const draft = useSyncExternalStore(subscribe, () => {
    let current = drafts.get(attachmentId);
    if (!current) {
      current = seed();
      drafts.set(attachmentId, current);
    }
    return current;
  });
  const setDraft = useCallback(
    (next: AwsOnboardingSettingsAnswer) => {
      drafts.set(attachmentId, next);
      notify();
    },
    [attachmentId]
  );
  return [draft, setDraft];
};
