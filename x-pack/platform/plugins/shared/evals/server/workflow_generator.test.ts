/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseWorkflowYamlToJSON } from '@kbn/workflows-yaml';
import { z } from '@kbn/zod/v4';
import {
  DATASET_FANOUT_THRESHOLD,
  generateExperimentRun,
  generateSavedWorkflowYaml,
  type WorkflowEvaluatorInput,
} from './workflow_generator';

interface ParsedStep {
  name: string;
  type: string;
  with?: Record<string, unknown>;
}
interface ParsedWorkflow {
  name: string;
  version: string;
  enabled: boolean;
  tags?: string[];
  triggers: Array<{ type: string }>;
  settings?: { timeout?: string };
  steps: ParsedStep[];
}

const workflowShape = z.looseObject({
  name: z.string(),
  steps: z.array(z.looseObject({ name: z.string(), type: z.string() })),
});

const parseYaml = (yaml: string): ParsedWorkflow => {
  const result = parseWorkflowYamlToJSON(yaml, workflowShape);
  if (!result.success) {
    throw new Error(`Generated YAML did not parse: ${result.error.message}\n---\n${yaml}`);
  }
  return result.data as unknown as ParsedWorkflow;
};

const evaluators: WorkflowEvaluatorInput[] = [{ name: 'correctness', connector_id: 'judge-1' }];

describe('workflow_generator', () => {
  describe('generateExperimentRun', () => {
    it('produces a single pooled execution for one model and few datasets', () => {
      const run = generateExperimentRun({
        connectorIds: ['gpt-4o'],
        datasetIds: ['ds-1', 'ds-2'],
        evaluators,
        concurrency: 4,
      });

      expect(run.mode).toBe('single');
      expect(run.compareBy).toBe('experiment');
      expect(run.executions).toHaveLength(1);
      expect(run.experimentIds).toHaveLength(1);

      const [execution] = run.executions;
      expect(execution.connectorId).toBe('gpt-4o');
      expect(execution.experimentId).toBe(run.experimentIds[0]);
      expect(execution.executionId).toBe(run.executionId);

      const def = parseYaml(execution.yaml);
      expect(def.version).toBe('1');
      expect(def.triggers).toEqual([{ type: 'manual' }]);
      expect(def.steps).toHaveLength(2);

      const [start, evaluate] = def.steps;
      expect(start.type).toBe('ai.evals.startExperiment');
      expect(start.with).toMatchObject({
        task_model: { id: 'gpt-4o' },
        experiment_id: run.experimentIds[0],
        execution_id: run.executionId,
      });

      expect(evaluate.type).toBe('ai.evals.evaluateDataset');
      expect(evaluate.with).toMatchObject({
        connector_id: 'gpt-4o',
        dataset_ids: ['ds-1', 'ds-2'],
        concurrency: 4,
        experiment_id: '{{ steps.start.output.experiment_id }}',
        experiment_name: 'Evaluate gpt-4o',
        execution_id: '{{ steps.start.output.execution_id }}',
      });
    });

    it('persists the given experiment name on the evaluate step so the UI shows it instead of the id', () => {
      const run = generateExperimentRun({
        name: 'My smoke test',
        connectorIds: ['gpt-4o'],
        datasetIds: ['ds-1'],
        evaluators,
      });

      const def = parseYaml(run.executions[0].yaml);
      expect(def.name).toBe('My smoke test');
      const evaluate = def.steps.find((s) => s.type === 'ai.evals.evaluateDataset');
      expect(evaluate?.with?.experiment_name).toBe('My smoke test');
    });

    it('fans out one execution per dataset above the threshold, sharing one experiment', () => {
      const datasetIds = Array.from({ length: DATASET_FANOUT_THRESHOLD + 1 }, (_, i) => `ds-${i}`);

      const run = generateExperimentRun({
        connectorIds: ['gpt-4o'],
        datasetIds,
        evaluators,
        concurrency: 5,
      });

      expect(run.mode).toBe('dataset-fanout');
      expect(run.compareBy).toBe('experiment');
      expect(run.executions).toHaveLength(datasetIds.length);
      expect(run.experimentIds).toHaveLength(1);

      const sharedExperimentId = run.experimentIds[0];
      for (const [index, execution] of run.executions.entries()) {
        expect(execution.datasetIds).toEqual([datasetIds[index]]);
        expect(execution.experimentId).toBe(sharedExperimentId);
        // Shards of one model share a single execution id (one row across shards).
        expect(execution.executionId).toBe(run.executionId);

        const def = parseYaml(execution.yaml);
        const evaluate = def.steps.find((s) => s.type === 'ai.evals.evaluateDataset');
        expect(evaluate?.with?.dataset_ids).toEqual([datasetIds[index]]);
        // 5 global concurrency spread across 6 executions => floor(5/6) clamped to >= 1
        expect(evaluate?.with?.concurrency).toBe(1);
        // Shards share one experiment, so the name must be constant (not per-dataset).
        expect(evaluate?.with?.experiment_name).toBe('Evaluate gpt-4o');
      }
    });

    it('fans out one execution per model for cross-model runs', () => {
      const run = generateExperimentRun({
        connectorIds: ['gpt-4o', 'claude'],
        datasetIds: ['ds-1'],
        evaluators,
      });

      expect(run.mode).toBe('cross-model');
      expect(run.compareBy).toBe('execution');
      expect(run.experimentIds).toEqual([]);
      expect(run.executions).toHaveLength(2);

      // Each model gets its OWN execution id (derived from the shared launch id) so it
      // becomes its own list row and its scores are not merged with the other model's.
      const executionIds = run.executions.map((execution) => execution.executionId);
      expect(new Set(executionIds).size).toBe(2);

      for (const [index, execution] of run.executions.entries()) {
        const connectorId = ['gpt-4o', 'claude'][index];
        expect(execution.connectorId).toBe(connectorId);
        expect(execution.executionId).toBe(`${run.executionId}::${connectorId}`);
        const def = parseYaml(execution.yaml);
        const start = def.steps.find((s) => s.type === 'ai.evals.startExperiment');
        // Per-model execution id is inlined; the experiment id is minted at runtime.
        expect(start?.with?.execution_id).toBe(`${run.executionId}::${connectorId}`);
        expect(start?.with?.experiment_id).toBeUndefined();
        // Every model is the SAME named experiment; the connector is NOT baked into the
        // name (it lives on task.model.id), matching the offline runner.
        const evaluate = def.steps.find((s) => s.type === 'ai.evals.evaluateDataset');
        expect(evaluate?.with?.experiment_name).toBe('Evaluate gpt-4o, claude');
      }
    });

    it('dedupes repeated connector ids', () => {
      const run = generateExperimentRun({
        connectorIds: ['gpt-4o', 'gpt-4o'],
        datasetIds: ['ds-1'],
        evaluators,
      });

      expect(run.mode).toBe('single');
      expect(run.executions).toHaveLength(1);
    });

    it('inlines space_ids on every evaluate step and omits it when not provided', () => {
      const withSpaces = generateExperimentRun({
        connectorIds: ['gpt-4o', 'claude'],
        datasetIds: ['ds-1'],
        evaluators,
        spaceIds: ['marketing', 'sales'],
      });
      for (const execution of withSpaces.executions) {
        const evaluate = parseYaml(execution.yaml).steps.find(
          (s) => s.type === 'ai.evals.evaluateDataset'
        );
        expect(evaluate?.with?.space_ids).toEqual(['marketing', 'sales']);
      }

      const withoutSpaces = generateExperimentRun({
        connectorIds: ['gpt-4o'],
        datasetIds: ['ds-1'],
        evaluators,
      });
      const evaluate = parseYaml(withoutSpaces.executions[0].yaml).steps.find(
        (s) => s.type === 'ai.evals.evaluateDataset'
      );
      expect(evaluate?.with).not.toHaveProperty('space_ids');
    });

    it('throws when no connector or dataset is provided', () => {
      expect(() =>
        generateExperimentRun({ connectorIds: [], datasetIds: ['ds-1'], evaluators })
      ).toThrow(/connector_id/);
      expect(() =>
        generateExperimentRun({ connectorIds: ['gpt-4o'], datasetIds: [], evaluators })
      ).toThrow(/dataset_id/);
    });
  });

  describe('generateSavedWorkflowYaml', () => {
    it('does not inline ids so each run mints a fresh experiment', () => {
      const { yaml, name } = generateSavedWorkflowYaml({
        connectorIds: ['gpt-4o'],
        datasetIds: ['ds-1'],
        evaluators,
      });

      expect(name).toContain('gpt-4o');
      const def = parseYaml(yaml);
      const start = def.steps.find((s) => s.type === 'ai.evals.startExperiment');
      expect(start?.with?.experiment_id).toBeUndefined();
      expect(start?.with?.execution_id).toBeUndefined();
      expect(start?.with).toMatchObject({ task_model: { id: 'gpt-4o' } });
      // The (static) workflow name is persisted as the experiment name on every run.
      const evaluate = def.steps.find((s) => s.type === 'ai.evals.evaluateDataset');
      expect(evaluate?.with?.experiment_name).toBe(name);
    });

    it('inlines space_ids on the evaluate step so scheduled runs keep the assignment', () => {
      const { yaml } = generateSavedWorkflowYaml({
        connectorIds: ['gpt-4o'],
        datasetIds: ['ds-1'],
        evaluators,
        spaceIds: ['marketing'],
      });
      const evaluate = parseYaml(yaml).steps.find((s) => s.type === 'ai.evals.evaluateDataset');
      expect(evaluate?.with?.space_ids).toEqual(['marketing']);
    });

    it('runs models sequentially and ends with a compare step for cross-model when requested', () => {
      const { yaml } = generateSavedWorkflowYaml({
        connectorIds: ['gpt-4o', 'claude'],
        datasetIds: ['ds-1'],
        evaluators,
        compare: true,
      });

      const def = parseYaml(yaml);
      const types = def.steps.map((s) => s.type);
      expect(types).toEqual([
        'ai.evals.startExperiment',
        'ai.evals.evaluateDataset',
        'ai.evals.startExperiment',
        'ai.evals.evaluateDataset',
        'ai.evals.compareExperiments',
      ]);

      const compare = def.steps.at(-1);
      expect(compare?.with?.experiment_ids).toEqual([
        '{{ steps.start_0.output.experiment_id }}',
        '{{ steps.start_1.output.experiment_id }}',
      ]);

      // Both per-model experiments share the one experiment name; the model differentiates.
      const evaluateNames = def.steps
        .filter((s) => s.type === 'ai.evals.evaluateDataset')
        .map((s) => s.with?.experiment_name);
      expect(evaluateNames).toEqual(['Evaluate gpt-4o, claude', 'Evaluate gpt-4o, claude']);
    });

    it('omits the compare step for cross-model by default (opt-in only)', () => {
      const { yaml } = generateSavedWorkflowYaml({
        connectorIds: ['gpt-4o', 'claude'],
        datasetIds: ['ds-1'],
        evaluators,
      });

      const def = parseYaml(yaml);
      const types = def.steps.map((s) => s.type);
      expect(types).toEqual([
        'ai.evals.startExperiment',
        'ai.evals.evaluateDataset',
        'ai.evals.startExperiment',
        'ai.evals.evaluateDataset',
      ]);
      expect(types).not.toContain('ai.evals.compareExperiments');
    });
  });
});
