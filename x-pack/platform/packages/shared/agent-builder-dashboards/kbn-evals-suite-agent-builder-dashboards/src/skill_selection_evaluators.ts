/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator } from '@kbn/evals';
import type { DashboardAgentTaskOutput, DashboardDatasetExample } from './types';

const DASHBOARD_GENERATE_TOOL_ID = 'platform.dashboard.generate_dashboard';

const getLowerCaseSkillPaths = (output: DashboardAgentTaskOutput): string[] =>
  getSkillReadPaths(output).map((path) => path.toLowerCase());

export const getSkillReadPaths = (output: DashboardAgentTaskOutput): string[] => {
  const steps = output.steps ?? [];
  const paths: string[] = [];

  for (const step of steps) {
    if (step.type !== 'tool_call') {
      continue;
    }

    if (step.tool_id === 'read_file' || step.tool_id === 'filestore.read') {
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
  getLowerCaseSkillPaths(output).some((path) => path.includes('dashboard'));

const didLoadVisualizationSkill = (output: DashboardAgentTaskOutput): boolean =>
  getLowerCaseSkillPaths(output).some(
    (path) => path.includes('visualization') || path.includes('visualization-creation')
  );

const didCallDashboardTool = (output: DashboardAgentTaskOutput): boolean =>
  getToolIds(output).includes(DASHBOARD_GENERATE_TOOL_ID);

export const dashboardSkillWithoutVisualizationEvaluator: Evaluator<
  DashboardDatasetExample,
  DashboardAgentTaskOutput
> = {
  name: 'Dashboard skill activated without visualization',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }): Promise<EvaluationResult> => {
    const skillReadPaths = getSkillReadPaths(output);
    const dashboardSkillLoaded = didLoadDashboardSkill(output);
    const visualizationSkillLoaded = didLoadVisualizationSkill(output);
    const passed = dashboardSkillLoaded && !visualizationSkillLoaded;

    return {
      score: passed ? 1 : 0,
      label: passed ? 'PASS' : 'FAIL',
      explanation: passed
        ? `Dashboard skill loaded without visualization skill. Paths: ${
            skillReadPaths.join(', ') || 'n/a'
          }`
        : `Expected dashboard skill without visualization skill. dashboardSkillLoaded=${dashboardSkillLoaded}, visualizationSkillLoaded=${visualizationSkillLoaded}. Paths: ${
            skillReadPaths.join(', ') || 'none'
          }`,
      metadata: { skillReadPaths, dashboardSkillLoaded, visualizationSkillLoaded },
    };
  },
};

export const visualizationSkillWithoutDashboardEvaluator: Evaluator<
  DashboardDatasetExample,
  DashboardAgentTaskOutput
> = {
  name: 'Visualization skill activated without dashboard',
  kind: 'CODE',
  direction: 'maximize',
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
  direction: 'maximize',
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
        ? `Dashboards skill was not used. Paths: ${skillReadPaths.join(', ') || 'n/a'}`
        : `Expected no dashboards skill. dashboardSkillLoaded=${dashboardSkillLoaded}, dashboardToolCalled=${dashboardToolCalled}. Paths: ${
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
