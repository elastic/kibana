/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { skippedResult } from '../evaluator_utils';
import { getLastWrittenDashboardId } from '../extract_dashboard';
import type { DashboardAgentEvaluator } from '../types';

export const PANEL_POINTER_SCOPE_EVALUATOR_NAME = 'Panel Pointer Scope';

/**
 * Panel pointers scope the message they are attached to. A later message that
 * does not mention the pointed panels must not be applied to them, so its turn
 * must not write the dashboard.
 */
export const panelPointerScopeEvaluator: DashboardAgentEvaluator = {
  name: PANEL_POINTER_SCOPE_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ expected, output }) => {
    if (!expected?.followUpKeepsDashboard) {
      return skippedResult('No panel pointer scope gold.');
    }
    const { followUpSteps } = output;
    if (!followUpSteps) {
      return skippedResult('The follow-up turn did not run.');
    }
    const writtenId = getLastWrittenDashboardId(followUpSteps);
    return writtenId === undefined
      ? { score: 1, label: 'scoped', explanation: 'The follow-up did not write the dashboard.' }
      : {
          score: 0,
          label: 'leaked',
          explanation: `The follow-up wrote dashboard "${writtenId}" although it is not about the pointed panels.`,
        };
  },
};
