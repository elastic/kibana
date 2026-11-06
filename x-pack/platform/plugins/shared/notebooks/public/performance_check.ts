/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { BehaviorSubject, skip } from 'rxjs';

const STORAGE_KEY = 'notebook.performanceCheck';

/**
 * The developer toolbar's start contract, declared here because `@kbn/developer-toolbar-plugin`
 * is dev-only and can't be imported by a plugin that ships.
 */
export interface DeveloperToolbarStart {
  registerItem: (item: { id: string; children: ReactNode; priority?: number }) => () => void;
}

/** Whether the notebook performance check is on, remembered across reloads. */
export const createPerformanceCheck$ = (): BehaviorSubject<boolean> => {
  const enabled$ = new BehaviorSubject(localStorage.getItem(STORAGE_KEY) === 'true');
  enabled$.pipe(skip(1)).subscribe((enabled) => localStorage.setItem(STORAGE_KEY, String(enabled)));
  return enabled$;
};
