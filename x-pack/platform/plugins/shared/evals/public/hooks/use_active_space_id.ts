/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';

/** The id of the space the user is in, or `undefined` until it resolves (or without the spaces plugin). */
export const useActiveSpaceId = (spaces?: SpacesPluginStart): string | undefined => {
  const [spaceId, setSpaceId] = useState<string>();

  useEffect(() => {
    if (!spaces) {
      return;
    }

    let isCurrent = true;
    spaces
      .getActiveSpace()
      .then((space) => {
        if (isCurrent) {
          setSpaceId(space.id);
        }
      })
      .catch(() => {
        // Without the active space the caller falls back to the default space.
      });

    return () => {
      isCurrent = false;
    };
  }, [spaces]);

  return spaceId;
};
