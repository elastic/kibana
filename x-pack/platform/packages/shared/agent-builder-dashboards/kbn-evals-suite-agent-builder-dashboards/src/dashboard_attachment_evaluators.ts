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
  grid?: {
    x?: number;
    y?: number;
    w?: number;
    h?: number;
  };
  title?: string;
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

const getDashboardSections = (panels: DashboardPanel[]): DashboardPanel[] => {
  return panels.filter((panel) => Array.isArray(panel.panels));
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

const getGridOverflowViolations = (
  panels: DashboardPanel[],
  maxColumns: number
): Array<{ id?: unknown; x?: number; w?: number }> => {
  const violations: Array<{ id?: unknown; x?: number; w?: number }> = [];

  for (const panel of panels) {
    const { grid } = panel;
    if (typeof grid?.x === 'number' && typeof grid.w === 'number' && grid.x + grid.w > maxColumns) {
      violations.push({ id: panel.id, x: grid.x, w: grid.w });
    }

    if (Array.isArray(panel.panels)) {
      violations.push(...getGridOverflowViolations(panel.panels, maxColumns));
    }
  }

  return violations;
};

export const dashboardAttachmentExistsEvaluator: Evaluator<
  DashboardDatasetExample,
  DashboardAgentTaskOutput
> = {
  name: 'Dashboard attachment exists',
  kind: 'CODE',
  evaluate: async ({ expected, output }): Promise<EvaluationResult> => {
    const expectedExists = expected?.expectedDashboardAttachment?.exists;
    if (typeof expectedExists !== 'boolean') {
      return { score: 1, label: 'SKIPPED' };
    }

    const exists = Boolean(getLatestDashboardAttachmentContent(output));
    const passed = exists === expectedExists;

    return {
      score: passed ? 1 : 0,
      label: passed ? 'PASS' : 'FAIL',
      explanation: expectedExists
        ? `Expected a dashboard attachment. Found attachment: ${exists}.`
        : `Expected no dashboard attachment. Found attachment: ${exists}.`,
      metadata: { expectedExists, exists },
    };
  },
};

export const dashboardAttachmentTitleEvaluator: Evaluator<
  DashboardDatasetExample,
  DashboardAgentTaskOutput
> = {
  name: 'Dashboard attachment title',
  kind: 'CODE',
  evaluate: async ({ expected, output }): Promise<EvaluationResult> => {
    const expectsNonEmptyTitle = expected?.expectedDashboardAttachment?.title?.nonEmpty;
    if (expectsNonEmptyTitle !== true) {
      return { score: 1, label: 'SKIPPED' };
    }

    const title = getLatestDashboardAttachmentContent(output)?.title;
    const passed = typeof title === 'string' && title.trim().length > 0;

    return {
      score: passed ? 1 : 0,
      label: passed ? 'PASS' : 'FAIL',
      explanation: `Expected a non-empty dashboard title. Found: ${title ?? 'none'}.`,
      metadata: { title },
    };
  },
};

export const dashboardPanelCountEvaluator: Evaluator<
  DashboardDatasetExample,
  DashboardAgentTaskOutput
> = {
  name: 'Dashboard panel count',
  kind: 'CODE',
  evaluate: async ({ expected, output }): Promise<EvaluationResult> => {
    const panelCountExpectation = expected?.expectedDashboardAttachment?.panelCount;
    const { min, max } = panelCountExpectation ?? {};
    if (typeof min !== 'number' && typeof max !== 'number') {
      return { score: 1, label: 'SKIPPED' };
    }

    const panels = getDashboardContentPanels(output);
    const panelCount = countDashboardPanels(panels);
    const passed =
      (typeof min !== 'number' || panelCount >= min) &&
      (typeof max !== 'number' || panelCount <= max);

    return {
      score: passed ? 1 : 0,
      label: passed ? 'PASS' : 'FAIL',
      explanation: `Expected dashboard panel count in range ${min ?? '-∞'}-${
        max ?? '∞'
      }, found ${panelCount}.`,
      metadata: { min, max, panelCount },
    };
  },
};

export const dashboardSectionShapeEvaluator: Evaluator<
  DashboardDatasetExample,
  DashboardAgentTaskOutput
> = {
  name: 'Dashboard section shape',
  kind: 'CODE',
  evaluate: async ({ expected, output }): Promise<EvaluationResult> => {
    const expectedAttachment = expected?.expectedDashboardAttachment;
    const expectedSectionCount = expectedAttachment?.sectionCount;
    const expectedSections = expectedAttachment?.sections ?? [];
    if (typeof expectedSectionCount !== 'number' && expectedSections.length === 0) {
      return { score: 1, label: 'SKIPPED' };
    }

    const panels = getDashboardContentPanels(output);
    const sections = getDashboardSections(panels);
    const sectionCount = sections.length;
    const sectionCountPassed =
      typeof expectedSectionCount !== 'number' || sectionCount === expectedSectionCount;
    const sectionFailures: string[] = [];

    for (const [index, expectedSection] of expectedSections.entries()) {
      const section = sections[index];
      if (!section) {
        sectionFailures.push(`Missing section at index ${index}.`);
        continue;
      }

      const title = section.title?.toLowerCase() ?? '';
      const missingTitleTerms =
        expectedSection.titleIncludes?.filter((term) => !title.includes(term.toLowerCase())) ?? [];
      if (missingTitleTerms.length > 0) {
        sectionFailures.push(
          `Section ${index} title is missing terms: ${missingTitleTerms.join(', ')}.`
        );
      }

      const panelCount = section.panels?.length ?? 0;
      if (typeof expectedSection.minPanels === 'number' && panelCount < expectedSection.minPanels) {
        sectionFailures.push(
          `Section ${index} expected at least ${expectedSection.minPanels} panel(s), found ${panelCount}.`
        );
      }
      if (typeof expectedSection.maxPanels === 'number' && panelCount > expectedSection.maxPanels) {
        sectionFailures.push(
          `Section ${index} expected at most ${expectedSection.maxPanels} panel(s), found ${panelCount}.`
        );
      }
    }

    const passed = sectionCountPassed && sectionFailures.length === 0;

    return {
      score: passed ? 1 : 0,
      label: passed ? 'PASS' : 'FAIL',
      explanation: passed
        ? `Dashboard section shape matched expectations. Found ${sectionCount} section(s).`
        : `Dashboard section shape did not match expectations. Expected ${
            expectedSectionCount ?? 'any'
          } section(s), found ${sectionCount}. ${sectionFailures.join(' ')}`,
      metadata: { expectedSectionCount, sectionCount, sectionFailures },
    };
  },
};

export const dashboardGridBoundsEvaluator: Evaluator<
  DashboardDatasetExample,
  DashboardAgentTaskOutput
> = {
  name: 'Dashboard grid bounds',
  kind: 'CODE',
  evaluate: async ({ expected, output }): Promise<EvaluationResult> => {
    const gridExpectation = expected?.expectedDashboardAttachment?.grid;
    if (gridExpectation?.noOverflow !== true) {
      return { score: 1, label: 'SKIPPED' };
    }

    const maxColumns = gridExpectation.maxColumns ?? 48;
    const panels = getDashboardContentPanels(output);
    const violations = getGridOverflowViolations(panels, maxColumns);
    const passed = violations.length === 0;

    return {
      score: passed ? 1 : 0,
      label: passed ? 'PASS' : 'FAIL',
      explanation: passed
        ? `All dashboard panels fit within ${maxColumns} columns.`
        : `${violations.length} dashboard panel(s) overflow ${maxColumns} columns.`,
      metadata: { maxColumns, violations },
    };
  },
};

export const dashboardMinPanelCountEvaluator = dashboardPanelCountEvaluator;
export const dashboardSectionCountEvaluator = dashboardSectionShapeEvaluator;
