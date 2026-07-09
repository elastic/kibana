/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Single source of truth for "which lifecycle flyouts are currently open" across the whole
 * stream detail lifecycle page (both the successful-data and failure-store sections).
 *
 * Flyouts can be nested arbitrarily deep (e.g. the ILM edit-phases flyout lives inside
 * `IlmLifecycleSummary`, several components below where cross-section blocking is decided).
 * Rather than threading a bespoke `isXFlyoutOpen`/`onXFlyoutOpenChange` prop pair through every
 * layer for each new flyout, any flyout owner registers itself directly via
 * {@link useRegisterLifecycleFlyoutOpen} from wherever its state actually lives, and any trigger
 * that needs to know whether it should be blocked reads
 * {@link LifecycleFlyoutCoordinationApi.isAnyFlyoutOpen} or
 * {@link LifecycleFlyoutCoordinationApi.isAnyOtherFlyoutOpen} directly.
 */
export interface LifecycleFlyoutCoordinationApi {
  /** True while at least one registered flyout is open (including the caller's own, if any). */
  isAnyFlyoutOpen: boolean;
  /** True while some flyout *other than* the given id(s) is open. Pass a single id to exclude just
   * your own flyout; pass an array to also exclude "adjacent" flyouts that get their own special
   * handling instead of being treated as generically blocking (e.g. a timeline that navigates into
   * a sibling flyout rather than going fully inert while it's open). */
  isAnyOtherFlyoutOpen: (id: StreamLifecycleFlyoutId | StreamLifecycleFlyoutId[]) => boolean;
  /** True while the specific flyout `id` is open. Lets a component read another flyout's open
   * state directly from the registry (e.g. to switch into a "navigate into that flyout" UI mode)
   * instead of needing it threaded through as a separate prop from whoever owns that flyout. */
  isFlyoutOpen: (id: StreamLifecycleFlyoutId) => boolean;
  /** Registers or clears a single flyout's open state. Prefer {@link useRegisterLifecycleFlyoutOpen}
   * over calling this directly, so the flyout is always cleared on unmount. */
  setFlyoutOpen: (id: StreamLifecycleFlyoutId, isOpen: boolean) => void;
}

const LifecycleFlyoutCoordinationContext = createContext<
  LifecycleFlyoutCoordinationApi | undefined
>(undefined);

export const LifecycleFlyoutCoordinationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [openFlyoutIds, setOpenFlyoutIds] = useState<ReadonlySet<StreamLifecycleFlyoutId>>(
    () => new Set()
  );

  const setFlyoutOpen = useCallback((id: StreamLifecycleFlyoutId, isOpen: boolean) => {
    setOpenFlyoutIds((prev) => {
      if (prev.has(id) === isOpen) return prev;
      const next = new Set(prev);
      if (isOpen) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const isAnyOtherFlyoutOpen = useCallback(
    (id: StreamLifecycleFlyoutId | StreamLifecycleFlyoutId[]) => {
      const excludeIds = Array.isArray(id) ? id : [id];
      for (const openId of openFlyoutIds) {
        if (!excludeIds.includes(openId)) return true;
      }
      return false;
    },
    [openFlyoutIds]
  );

  const isFlyoutOpen = useCallback(
    (id: StreamLifecycleFlyoutId) => openFlyoutIds.has(id),
    [openFlyoutIds]
  );

  const value = useMemo<LifecycleFlyoutCoordinationApi>(
    () => ({
      isAnyFlyoutOpen: openFlyoutIds.size > 0,
      isAnyOtherFlyoutOpen,
      isFlyoutOpen,
      setFlyoutOpen,
    }),
    [isAnyOtherFlyoutOpen, isFlyoutOpen, openFlyoutIds, setFlyoutOpen]
  );

  return (
    <LifecycleFlyoutCoordinationContext.Provider value={value}>
      {children}
    </LifecycleFlyoutCoordinationContext.Provider>
  );
};

/** Access lifecycle flyout coordination state (requires `LifecycleFlyoutCoordinationProvider`). */
export const useLifecycleFlyoutCoordination = (): LifecycleFlyoutCoordinationApi => {
  const ctx = useContext(LifecycleFlyoutCoordinationContext);
  if (!ctx) {
    // Provider is expected to be placed at the page level, wrapping both the successful-data
    // and failure-store sections.
    throw new Error(
      'useLifecycleFlyoutCoordination must be used within a LifecycleFlyoutCoordinationProvider'
    );
  }
  return ctx;
};

/**
 * Registers a lifecycle flyout's open state under a stable, globally-unique `id` for the lifetime
 * of the calling component. Clears itself on unmount so a component that goes away while its
 * flyout is open doesn't leave the registry (and every trigger that reads it) permanently blocked.
 */
export const useRegisterLifecycleFlyoutOpen = (
  id: StreamLifecycleFlyoutId,
  isOpen: boolean
): void => {
  const { setFlyoutOpen } = useLifecycleFlyoutCoordination();

  useEffect(() => {
    setFlyoutOpen(id, isOpen);
    return () => setFlyoutOpen(id, false);
  }, [id, isOpen, setFlyoutOpen]);
};

/**
 * Every lifecycle flyout id used across the stream detail lifecycle page, kept in one place so
 * the registering side (wherever a flyout's state lives) and any exclusion lists built elsewhere
 * (e.g. a timeline deciding whether to go fully inert) can't drift out of sync.
 */
export const STREAM_LIFECYCLE_FLYOUT_IDS = {
  successfulLifecycle: 'successful-lifecycle',
  successfulDeletePhase: 'successful-delete-phase',
  dataPhases: 'data-phases',
  ilmEditPhases: 'ilm-edit-phases',
  downsampleSteps: 'downsample-steps',
  failedLifecycle: 'failed-lifecycle',
  failedDeletePhase: 'failed-delete-phase',
} as const;

export type StreamLifecycleFlyoutId =
  (typeof STREAM_LIFECYCLE_FLYOUT_IDS)[keyof typeof STREAM_LIFECYCLE_FLYOUT_IDS];
