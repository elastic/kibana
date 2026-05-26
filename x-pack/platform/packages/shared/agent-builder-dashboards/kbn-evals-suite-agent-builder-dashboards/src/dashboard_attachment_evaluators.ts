/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator } from '@kbn/evals';
import type { DashboardAgentTaskOutput, DashboardDatasetExample } from './evaluate_dataset';

interface DashboardPanel {
  panels?: DashboardPanel[];
  [key: string]: unknown;
}

interface DashboardAttachmentContent {
  title?: string;
  description?: string;
  panels?: DashboardPanel[];
  [key: string]: unknown;
}

interface DashboardAttachmentContainer {
  data?: {
    dashboardAttachment?: {
      content?: DashboardAttachmentContent;
    };
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getDashboardAttachmentContent = (value: unknown): DashboardAttachmentContent | undefined => {
  const content = (value as DashboardAttachmentContainer).data?.dashboardAttachment?.content;
  if (content && Array.isArray(content.panels)) {
    return content;
  }

  if (Array.isArray(value)) {
    for (const item of value.toReversed()) {
      const nestedContent = getDashboardAttachmentContent(item);
      if (nestedContent) {
        return nestedContent;
      }
    }
  }

  if (isRecord(value)) {
    for (const nestedValue of Object.values(value).toReversed()) {
      const nestedContent = getDashboardAttachmentContent(nestedValue);
      if (nestedContent) {
        return nestedContent;
      }
    }
  }

  return undefined;
};

export const getLatestDashboardAttachmentContent = (
  output: DashboardAgentTaskOutput
): DashboardAttachmentContent | undefined => {
  for (const step of (output.steps ?? []).toReversed()) {
    const content = getDashboardAttachmentContent(step);
    if (content) {
      return content;
    }
  }

  return undefined;
};

const getDashboardContentPanels = (output: DashboardAgentTaskOutput): DashboardPanel[] => {
  return getLatestDashboardAttachmentContent(output)?.panels ?? [];
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
