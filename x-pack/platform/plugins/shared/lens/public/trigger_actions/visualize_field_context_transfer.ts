/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

/**
 * A `VisualizeFieldContext` is too large to travel in a URL (it contains a full
 * data view spec, which may describe an ad-hoc data view that cannot be resolved
 * by id in a fresh tab). When the visualize-field action opens Lens in a new tab,
 * the context is passed through sessionStorage instead, which `window.open`
 * clones into the new same-origin tab.
 */
const VISUALIZE_FIELD_CONTEXT_STORAGE_KEY = 'lens-visualize-field-context';

export interface StoredVisualizeFieldContext {
  payload: VisualizeFieldContext;
  originatingApp?: string;
}

export const storeVisualizeFieldContext = (
  context: VisualizeFieldContext,
  storage: Storage = new Storage(window.sessionStorage)
): void => {
  const stored: StoredVisualizeFieldContext = {
    payload: context,
    originatingApp: context.originatingApp,
  };
  storage.set(VISUALIZE_FIELD_CONTEXT_STORAGE_KEY, stored);
};

export const removeStoredVisualizeFieldContext = (
  storage: Storage = new Storage(window.sessionStorage)
): void => {
  storage.remove(VISUALIZE_FIELD_CONTEXT_STORAGE_KEY);
};

/**
 * Reads and removes the stored context, so it is only consumed once and cannot
 * be picked up by a later navigation to Lens in the same tab.
 */
export const takeStoredVisualizeFieldContext = (
  storage: Storage = new Storage(window.sessionStorage)
): StoredVisualizeFieldContext | undefined => {
  const stored: StoredVisualizeFieldContext | null = storage.get(
    VISUALIZE_FIELD_CONTEXT_STORAGE_KEY
  );
  if (!stored) {
    return undefined;
  }
  storage.remove(VISUALIZE_FIELD_CONTEXT_STORAGE_KEY);
  return stored;
};
