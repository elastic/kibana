/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';

/** Resolves the active space id, or `undefined` while it loads / when the spaces plugin is absent. */
export const useSpaceId = (spaces?: SpacesPluginStart): string | undefined => {
  const [spaceId, setSpaceId] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    if (spaces) {
      spaces
        .getActiveSpace()
        .then((space) => {
          if (!cancelled) {
            setSpaceId(space.id);
          }
        })
        // Degrade to no space id (and thus no trace) rather than throwing an unhandled rejection.
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [spaces]);

  return spaceId;
};
