/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';

/**
 * Chart actions are shown in Observability and Classic spaces. Security and Search spaces
 * hide them because the analyses and drill-downs do not target those solutions.
 */
export const isObservabilityOrClassicSpace = (solution: string | undefined): boolean =>
  solution === undefined || solution === 'oblt' || solution === 'classic';

export interface ActiveSpaceState {
  isCompatibleSpace: () => boolean;
}

/**
 * Tracks the active space via `getActiveSpace$()`. Compatibility stays false until the
 * first space arrives, so `isCompatible` can check the solution synchronously.
 */
export const createActiveSpaceState = (spaces?: SpacesPluginStart): ActiveSpaceState => {
  if (!spaces) {
    return { isCompatibleSpace: () => true };
  }

  let resolved = false;
  let currentSolution: string | undefined;

  spaces.getActiveSpace$().subscribe({
    next: (space) => {
      resolved = true;
      currentSolution = space?.solution;
    },
  });

  return {
    isCompatibleSpace: () => resolved && isObservabilityOrClassicSpace(currentSolution),
  };
};
