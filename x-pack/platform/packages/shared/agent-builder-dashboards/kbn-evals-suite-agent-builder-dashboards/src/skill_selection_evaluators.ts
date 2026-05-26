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

const getLowerCaseSkillPaths = (output: DashboardAgentTaskOutput): string[] =>
  getSkillReadPaths(output).map((path) => path.toLowerCase());

export const getSkillReadPaths = (output: DashboardAgentTaskOutput): string[] => {
  const steps = output.steps ?? [];
  const paths: string[] = [];

  for (const step of steps) {
    if (step.type !== 'tool_call') {
      continue;
    }

    if (step.tool_id === 'filestore.read') {
      const params = step.params as { path?: string } | undefined;
      if (params?.path) {
        paths.push(params.path);
      }
    }

    if (step.tool_id === 'load_skill') {
      const params = step.params as { skill?: string } | undefined;
      if (params?.skill) {
        paths.push(params.skill);
      }

      const results = Array.isArray(step.results) ? step.results : [];
      for (const result of results) {
        const data = (
          result as { data?: { skill?: { path?: string; id?: string; name?: string } } }
        ).data;
        if (data?.skill?.path) {
          paths.push(data.skill.path);
        }
        if (data?.skill?.id) {
          paths.push(data.skill.id);
        }
        if (data?.skill?.name) {
          paths.push(data.skill.name);
        }
      }
    }
  }

  return paths.filter(Boolean);
};

export const getToolIds = (output: DashboardAgentTaskOutput): string[] => {
  const steps = output.steps ?? [];
  return steps
    .filter((step) => step.type === 'tool_call')
    .map((step) => (typeof step.tool_id === 'string' ? step.tool_id : ''))
    .filter(Boolean);
};

const didLoadDashboardSkill = (output: DashboardAgentTaskOutput): boolean =>
  getLowerCaseSkillPaths(output).some(
    (path) => path.includes('dashboard') || path.includes('dashboard-management')
  );

const didLoadVisualizationSkill = (output: DashboardAgentTaskOutput): boolean =>
  getLowerCaseSkillPaths(output).some(
    (path) => path.includes('visualization') || path.includes('visualization-creation')
  );

const didCallDashboardTool = (output: DashboardAgentTaskOutput): boolean =>
  getToolIds(output).includes(DASHBOARD_MANAGEMENT_TOOL_ID);

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

export const dashboardSkillActivatedEvaluator: Evaluator<
  DashboardDatasetExample,
  DashboardAgentTaskOutput
> = {
  name: 'Dashboard skill activated',
  kind: 'CODE',
  evaluate: async ({ output }): Promise<EvaluationResult> => {
    const skillReadPaths = getSkillReadPaths(output);
    const dashboardSkillLoaded = didLoadDashboardSkill(output);

    return {
      score: dashboardSkillLoaded ? 1 : 0,
      label: dashboardSkillLoaded ? 'PASS' : 'FAIL',
      explanation: dashboardSkillLoaded
        ? `Dashboard skill activation detected. Paths: ${skillReadPaths.join(', ') || 'n/a'}`
        : `Dashboard skill activation not detected. Paths: ${skillReadPaths.join(', ') || 'none'}`,
      metadata: { skillReadPaths, dashboardSkillLoaded },
    };
  },
};

export const visualizationSkillWithoutDashboardEvaluator: Evaluator<
  DashboardDatasetExample,
  DashboardAgentTaskOutput
> = {
  name: 'Visualization skill activated without dashboard',
  kind: 'CODE',
  evaluate: async ({ output }): Promise<EvaluationResult> => {
    const skillReadPaths = getSkillReadPaths(output);
    const toolIds = getToolIds(output);
    const visualizationSkillLoaded = didLoadVisualizationSkill(output);
    const dashboardSkillLoaded = didLoadDashboardSkill(output);
    const dashboardToolCalled = didCallDashboardTool(output);
    const passed = visualizationSkillLoaded && !dashboardSkillLoaded && !dashboardToolCalled;

    return {
      score: passed ? 1 : 0,
      label: passed ? 'PASS' : 'FAIL',
      explanation: passed
        ? `Visualization skill loaded without dashboard creation. Paths: ${
            skillReadPaths.join(', ') || 'n/a'
          }`
        : `Expected visualization skill without dashboard. visualizationSkillLoaded=${visualizationSkillLoaded}, dashboardSkillLoaded=${dashboardSkillLoaded}, dashboardToolCalled=${dashboardToolCalled}. Paths: ${
            skillReadPaths.join(', ') || 'none'
          }. Tool IDs: ${toolIds.join(', ') || 'none'}`,
      metadata: {
        skillReadPaths,
        toolIds,
        visualizationSkillLoaded,
        dashboardSkillLoaded,
        dashboardToolCalled,
      },
    };
  },
};

export const dashboardSkillNotActivatedEvaluator: Evaluator<
  DashboardDatasetExample,
  DashboardAgentTaskOutput
> = {
  name: 'Dashboard skill not activated',
  kind: 'CODE',
  evaluate: async ({ output }): Promise<EvaluationResult> => {
    const skillReadPaths = getSkillReadPaths(output);
    const toolIds = getToolIds(output);
    const dashboardSkillLoaded = didLoadDashboardSkill(output);
    const dashboardToolCalled = didCallDashboardTool(output);
    const passed = !dashboardSkillLoaded && !dashboardToolCalled;

    return {
      score: passed ? 1 : 0,
      label: passed ? 'PASS' : 'FAIL',
      explanation: passed
        ? `Dashboard management was not used. Paths: ${skillReadPaths.join(', ') || 'n/a'}`
        : `Expected no dashboard management. dashboardSkillLoaded=${dashboardSkillLoaded}, dashboardToolCalled=${dashboardToolCalled}. Paths: ${
            skillReadPaths.join(', ') || 'none'
          }. Tool IDs: ${toolIds.join(', ') || 'none'}`,
      metadata: {
        skillReadPaths,
        toolIds,
        dashboardSkillLoaded,
        dashboardToolCalled,
      },
    };
  },
};

export const dashboardMinPanelCountEvaluator: Evaluator<
  DashboardDatasetExample,
  DashboardAgentTaskOutput
> = {
  name: 'Dashboard minimum panel count',
  kind: 'CODE',
  evaluate: async ({ expected, output }): Promise<EvaluationResult> => {
    const expectedMinPanels = expected?.expectedMinPanels;
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
    const expectedSectionCount = expected?.expectedSectionCount;
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
