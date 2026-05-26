/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator } from '@kbn/evals';
import type { DashboardAgentTaskOutput, DashboardDatasetExample } from './evaluate_dataset';

const DASHBOARD_MANAGEMENT_TOOL_ID = 'platform.dashboard.manage_dashboard';

interface DashboardPanel {
  panels?: DashboardPanel[];
  [key: string]: unknown;
}

interface DashboardAttachmentResult {
  data?: {
    dashboardAttachment?: {
      content?: {
        panels?: DashboardPanel[];
      };
    };
  };
}

const getDashboardContentPanels = (output: DashboardAgentTaskOutput): DashboardPanel[] => {
  const steps = output.steps ?? [];

  for (const step of steps.toReversed()) {
    if (step.type !== 'tool_call' || step.tool_id !== DASHBOARD_MANAGEMENT_TOOL_ID) {
      continue;
    }

    const results = Array.isArray(step.results) ? step.results : [];
    for (const result of results.toReversed()) {
      const panels = (result as DashboardAttachmentResult).data?.dashboardAttachment?.content
        ?.panels;
      if (Array.isArray(panels)) {
        return panels;
      }
    }
  }

  return [];
};

const countDashboardPanels = (panels: DashboardPanel[]): number => {
  return panels.reduce((total, panel) => {
    if (Array.isArray(panel.panels)) {
      return total + countDashboardPanels(panel.panels);
    }
    return total + 1;
  }, 0);
};

const countDashboardSections = (panels: DashboardPanel[]): number => {
  return panels.reduce((total, panel) => {
    const nestedPanels = Array.isArray(panel.panels) ? panel.panels : undefined;
    return total + (nestedPanels ? 1 + countDashboardSections(nestedPanels) : 0);
  }, 0);
};

export const dashboardMinPanelCountEvaluator: Evaluator<
  DashboardDatasetExample,
  DashboardAgentTaskOutput
> = {
  name: 'Dashboard minimum panel count',
  kind: 'CODE',
  evaluate: async ({ expected, output }): Promise<EvaluationResult> => {
    const expectedMinPanels = expected?.expectedDashboardAttachment?.panelCount?.min;
    if (typeof expectedMinPanels !== 'number') {
      return { score: 1, label: 'SKIPPED' };
    }

    const panels = getDashboardContentPanels(output);
    const panelCount = countDashboardPanels(panels);
    const passed = panelCount >= expectedMinPanels;

    return {
      score: passed ? 1 : 0,
      label: passed ? 'PASS' : 'FAIL',
      explanation: `Expected at least ${expectedMinPanels} dashboard panel(s), found ${panelCount}.`,
      metadata: { expectedMinPanels, panelCount },
    };
  },
};

export const dashboardSectionCountEvaluator: Evaluator<
  DashboardDatasetExample,
  DashboardAgentTaskOutput
> = {
  name: 'Dashboard section count',
  kind: 'CODE',
  evaluate: async ({ expected, output }): Promise<EvaluationResult> => {
    const expectedSectionCount = expected?.expectedDashboardAttachment?.sectionCount;
    if (typeof expectedSectionCount !== 'number') {
      return { score: 1, label: 'SKIPPED' };
    }

    const panels = getDashboardContentPanels(output);
    const sectionCount = countDashboardSections(panels);
    const passed = sectionCount === expectedSectionCount;

    return {
      score: passed ? 1 : 0,
      label: passed ? 'PASS' : 'FAIL',
      explanation: `Expected ${expectedSectionCount} dashboard section(s), found ${sectionCount}.`,
      metadata: { expectedSectionCount, sectionCount },
    };
  },
};
