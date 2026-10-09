/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

/**
 * What one extended-fields form contributes to the section it lives in. A section can hold more than
 * one form (global fields and template fields are separate forms), so the section — not the form —
 * owns edit mode, and Save merges every form's changes into a single case update. Saving them
 * separately would mean two PATCHes racing on the same case version.
 */
export interface SectionEditFormApi {
  changedCount: number;
  /** Validates and returns only the changed values, or `null` when the form is invalid. */
  collect: () => Promise<Record<string, unknown> | null>;
  /** Re-baselines the form on its current values once the section save has landed. */
  commit: () => void;
  /** Discards local edits and returns to the committed values. */
  reset: () => void;
}

interface SectionEditContextValue {
  isEditing: boolean;
  isSaving: boolean;
  /** Total number of changed fields across every form in the section. */
  changedCount: number;
  requestEdit: () => void;
  cancelEdit: () => void;
  saveEdits: () => void;
  registerForm: (id: string, api: SectionEditFormApi) => void;
  unregisterForm: (id: string) => void;
}

const SectionEditContext = createContext<SectionEditContextValue | undefined>(undefined);

export const useSectionEdit = () => useContext(SectionEditContext);

interface SectionEditProviderProps {
  onSave: (
    values: Record<string, unknown>,
    handlers: { onSuccess: () => void; onError: () => void }
  ) => void;
}

export const SectionEditProvider: FC<PropsWithChildren<SectionEditProviderProps>> = ({
  children,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Counts drive the bar's label, so they live in state; the APIs themselves are only ever called
  // from handlers, so they live in a ref and never trigger a render.
  const [changedCounts, setChangedCounts] = useState<Record<string, number>>({});
  const formApisRef = useRef(new Map<string, SectionEditFormApi>());

  const registerForm = useCallback((id: string, api: SectionEditFormApi) => {
    formApisRef.current.set(id, api);
    setChangedCounts((previous) =>
      previous[id] === api.changedCount ? previous : { ...previous, [id]: api.changedCount }
    );
  }, []);

  const unregisterForm = useCallback((id: string) => {
    formApisRef.current.delete(id);
    setChangedCounts(({ [id]: _removed, ...rest }) => rest);
  }, []);

  const changedCount = useMemo(
    () => Object.values(changedCounts).reduce((total, count) => total + count, 0),
    [changedCounts]
  );

  const requestEdit = useCallback(() => setIsEditing(true), []);

  const onCancel = useCallback(() => {
    formApisRef.current.forEach((api) => api.reset());
    setIsEditing(false);
  }, []);

  const onConfirm = useCallback(async () => {
    const apis = [...formApisRef.current.values()];
    const collected = await Promise.all(apis.map((api) => api.collect()));

    // Stay in edit mode when any form is invalid: the field-level errors are the message.
    if (collected.some((values) => values == null)) {
      return;
    }

    const merged = Object.assign({}, ...collected) as Record<string, unknown>;
    if (Object.keys(merged).length === 0) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    onSave(merged, {
      onSuccess: () => {
        apis.forEach((api) => api.commit());
        setIsSaving(false);
        setIsEditing(false);
      },
      onError: () => setIsSaving(false),
    });
  }, [onSave]);

  const contextValue = useMemo<SectionEditContextValue>(
    () => ({
      isEditing,
      isSaving,
      changedCount,
      requestEdit,
      cancelEdit: onCancel,
      saveEdits: onConfirm,
      registerForm,
      unregisterForm,
    }),
    [
      isEditing,
      isSaving,
      changedCount,
      requestEdit,
      onCancel,
      onConfirm,
      registerForm,
      unregisterForm,
    ]
  );

  // State only — no wrapper element. The section that owns this provider renders the edit bar in its
  // own (pinned) header, which is the only place in an EuiAccordion that can stay in view: the
  // accordion's child wrapper is `overflow: hidden` for its open/close animation, so anything
  // sticky inside the section body is clipped and never pins.
  return <SectionEditContext.Provider value={contextValue}>{children}</SectionEditContext.Provider>;
};

SectionEditProvider.displayName = 'SectionEditProvider';
