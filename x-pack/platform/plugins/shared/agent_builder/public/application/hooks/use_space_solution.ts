/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { SolutionView } from '@kbn/spaces-plugin/common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';

/** Active space Solution View; `undefined` while loading, `classic` when unset. */
export const useSpaceSolution = (spaces?: SpacesPluginStart): SolutionView | undefined => {
  const [solution, setSolution] = useState<SolutionView>();

  useEffect(() => {
    let cancelled = false;
    if (!spaces) {
      setSolution('classic');
      return () => {
        cancelled = true;
      };
    }
    spaces
      .getActiveSpace()
      .then((space) => {
        if (!cancelled) setSolution(space.solution ?? 'classic');
      })
      .catch(() => {
        if (!cancelled) setSolution('classic');
      });
    return () => {
      cancelled = true;
    };
  }, [spaces]);

  return solution;
};
