/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';

export interface UseSpaceIdResult {
  /** The active space id, or `undefined` while it resolves / when the spaces plugin is absent. */
  spaceId: string | undefined;
  /** True while the active space is still being resolved — distinct from "no space". */
  isResolving: boolean;
}

/**
 * Resolves the active space id. Callers need to tell "still resolving" apart from "resolved, no
 * space" (e.g. to avoid showing a terminal "no trace" state during the async resolution), so this
 * returns an explicit `isResolving` flag alongside the id.
 */
export const useSpaceId = (spaces?: SpacesPluginStart): UseSpaceIdResult => {
  const [spaceId, setSpaceId] = useState<string>();
  // Only "resolving" when a spaces plugin is present to resolve from.
  const [isResolving, setIsResolving] = useState<boolean>(Boolean(spaces));

  useEffect(() => {
    let cancelled = false;
    if (!spaces) {
      setIsResolving(false);
      return;
    }
    setIsResolving(true);
    spaces
      .getActiveSpace()
      .then((space) => {
        if (!cancelled) {
          setSpaceId(space.id);
        }
      })
      // Degrade to no space id (and thus no trace) rather than throwing an unhandled rejection.
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setIsResolving(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [spaces]);

  return { spaceId, isResolving };
};
