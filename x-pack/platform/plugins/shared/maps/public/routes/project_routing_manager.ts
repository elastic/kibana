/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProjectRouting } from '@kbn/es-query';
import { distinctUntilChanged } from 'rxjs';
import { getCps } from '../kibana_services';

/**
 * Initializes project routing manager for Maps app.
 * Handles subscription to CPS project picker changes and project routing overrides.
 *
 * @param onProjectRoutingChange - Callback invoked when project routing changes
 * @returns Cleanup function to unsubscribe and cleanup resources
 */
export function initializeProjectRoutingManager({
  onProjectRoutingChange,
}: {
  onProjectRoutingChange: (projectRouting: ProjectRouting) => void;
}) {
  const cpsManager = getCps()?.cpsManager;

  if (!cpsManager || cpsManager.getProjectPickerAccess() === 'disabled') {
    return;
  }

  const initialProjectRouting = cpsManager.getProjectRouting();

  if (initialProjectRouting) {
    onProjectRoutingChange(initialProjectRouting);
  }

  const cpsProjectRoutingSubscription = cpsManager
    .getProjectRouting$()
    .pipe(distinctUntilChanged())
    .subscribe((cpsProjectRouting: ProjectRouting) => {
      onProjectRoutingChange(cpsProjectRouting);
    });

  return () => {
    cpsProjectRoutingSubscription?.unsubscribe();
  };
}
