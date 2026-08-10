/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import type { VisualizationAgentTaskOutput } from './evaluate_dataset';
import { visualizationSkillActivatedEvaluator } from './skill_selection_evaluators';

const createOutput = (
  steps: VisualizationAgentTaskOutput['steps']
): VisualizationAgentTaskOutput => ({
  errors: [],
  messages: [{ message: '' }],
  steps,
  esql: '',
});

const evaluateOutput = async (output: VisualizationAgentTaskOutput) =>
  visualizationSkillActivatedEvaluator.evaluate({
    input: { question: 'Create a bar chart of requests' },
    expected: { expected: 'A visualization' },
    metadata: undefined,
    output,
  });

describe('visualizationSkillActivatedEvaluator', () => {
  it('passes when the visualization skill is loaded and create_visualization is called', async () => {
    const result = await evaluateOutput(
      createOutput([
        {
          type: 'tool_call',
          tool_id: 'load_skill',
          params: { skill: 'visualization-creation' },
          results: [
            {
              data: {
                skill: {
                  path: 'skills/platform/visualization/visualization-creation',
                  id: 'visualization-creation',
                  name: 'visualization-creation',
                },
              },
            },
          ],
        },
        {
          type: 'tool_call',
          tool_id: platformCoreTools.createVisualization,
        },
      ])
    );

    expect(result.score).toBe(1);
    expect(result.label).toBe('PASS');
    expect(result.metadata).toEqual(
      expect.objectContaining({
        visualizationSkillLoaded: true,
        createVisualizationCalled: true,
      })
    );
  });

  it('fails when create_visualization is never called', async () => {
    const result = await evaluateOutput(
      createOutput([
        {
          type: 'tool_call',
          tool_id: 'load_skill',
          params: { skill: 'visualization-creation' },
        },
        {
          type: 'tool_call',
          tool_id: 'platform.core.generate_esql',
        },
      ])
    );

    expect(result.score).toBe(0);
    expect(result.label).toBe('FAIL');
    expect(result.metadata).toEqual(
      expect.objectContaining({
        visualizationSkillLoaded: true,
        createVisualizationCalled: false,
      })
    );
  });

  it('fails when a non-visualization skill is loaded even if create_visualization is called', async () => {
    const result = await evaluateOutput(
      createOutput([
        {
          type: 'tool_call',
          tool_id: 'load_skill',
          params: { skill: 'dashboard-management' },
          results: [
            {
              data: {
                skill: {
                  path: 'skills/platform/dashboard/dashboard-management',
                  id: 'dashboard-management',
                  name: 'dashboard-management',
                },
              },
            },
          ],
        },
        {
          type: 'tool_call',
          tool_id: platformCoreTools.createVisualization,
        },
      ])
    );

    expect(result.score).toBe(0);
    expect(result.label).toBe('FAIL');
    expect(result.metadata).toEqual(
      expect.objectContaining({
        visualizationSkillLoaded: false,
        createVisualizationCalled: true,
      })
    );
  });

  it('does not treat an unrelated path that merely contains "visualization" as a match', async () => {
    const result = await evaluateOutput(
      createOutput([
        {
          type: 'tool_call',
          tool_id: 'load_skill',
          params: { skill: 'custom-visualization-helpers' },
          results: [
            {
              data: {
                skill: {
                  path: 'skills/custom/visualization-helpers',
                  id: 'custom-visualization-helpers',
                  name: 'custom-visualization-helpers',
                },
              },
            },
          ],
        },
        {
          type: 'tool_call',
          tool_id: platformCoreTools.createVisualization,
        },
      ])
    );

    expect(result.score).toBe(0);
    expect(result.metadata).toEqual(
      expect.objectContaining({
        visualizationSkillLoaded: false,
        createVisualizationCalled: true,
      })
    );
  });
});
