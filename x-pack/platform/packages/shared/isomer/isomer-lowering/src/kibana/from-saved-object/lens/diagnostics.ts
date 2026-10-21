/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ViewPlanDiagnostic } from '../../plan/view_plan';

// A small accumulator used by the lowering steps so call sites can push
// codes and messages without juggling an array. The returned `list` is
// passed onto `planAdaptiveLens` via `options.diagnostics`.

export interface DiagnosticBag {
  list: ViewPlanDiagnostic[];
  push: (entry: ViewPlanDiagnostic) => void;
}

export const createDiagnosticBag = (panelId?: string): DiagnosticBag => {
  const list: ViewPlanDiagnostic[] = [];
  return {
    list,
    push: (entry) => {
      list.push(panelId ? { ...entry, panelId } : entry);
    },
  };
};
