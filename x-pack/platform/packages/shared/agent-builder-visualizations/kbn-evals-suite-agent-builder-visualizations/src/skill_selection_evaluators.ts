/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator } from '@kbn/evals';
import { platformCoreTools } from '@kbn/agent-builder-common';
import type { VisualizationAgentTaskOutput, VisualizationDatasetExample } from './evaluate_dataset';
import { getSkillReadPaths, getToolIds } from './extract_visualization';

const CREATE_VISUALIZATION_TOOL_ID = platformCoreTools.createVisualization;
const VISUALIZATION_CREATION_SKILL_ID = 'visualization-creation';

const didLoadVisualizationSkill = (output: VisualizationAgentTaskOutput): boolean =>
  getSkillReadPaths(output)
    .map((path) => path.toLowerCase())
    .some(
      (path) =>
        path === VISUALIZATION_CREATION_SKILL_ID ||
        path.endsWith(`/${VISUALIZATION_CREATION_SKILL_ID}`)
    );

const didCallCreateVisualizationTool = (output: VisualizationAgentTaskOutput): boolean =>
  getToolIds(output).includes(CREATE_VISUALIZATION_TOOL_ID);

/**
 * Routing check: the standalone visualization request should load the
 * visualization-creation skill AND call `create_visualization`. This is the
 * viz analogue of the dashboards suite's skill-activation evaluator — it
 * guards against the agent silently answering with raw ES|QL or a table
 * instead of a rendered visualization.
 */
export const visualizationSkillActivatedEvaluator: Evaluator<
  VisualizationDatasetExample,
  VisualizationAgentTaskOutput
> = {
  name: 'Visualization skill activated',
  kind: 'CODE',
  evaluate: async ({ output }): Promise<EvaluationResult> => {
    const skillReadPaths = getSkillReadPaths(output);
    const toolIds = getToolIds(output);
    const visualizationSkillLoaded = didLoadVisualizationSkill(output);
    const createVisualizationCalled = didCallCreateVisualizationTool(output);
    const passed = visualizationSkillLoaded && createVisualizationCalled;

    return {
      score: passed ? 1 : 0,
      label: passed ? 'PASS' : 'FAIL',
      explanation: passed
        ? `Visualization skill loaded and create_visualization called. Paths: ${
            skillReadPaths.join(', ') || 'n/a'
          }`
        : `Expected the visualization skill and create_visualization. visualizationSkillLoaded=${visualizationSkillLoaded}, createVisualizationCalled=${createVisualizationCalled}. Paths: ${
            skillReadPaths.join(', ') || 'none'
          }. Tool IDs: ${toolIds.join(', ') || 'none'}`,
      metadata: {
        skillReadPaths,
        toolIds,
        visualizationSkillLoaded,
        createVisualizationCalled,
      },
    };
  },
};
