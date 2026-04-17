/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolRunnableConfig } from '@langchain/core/tools';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { Command, getCurrentTaskInput } from '@langchain/langgraph';
import { ToolMessage } from '@langchain/core/messages';
import { z } from '@kbn/zod/v4';
import type { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';

import type { AutomaticImportAgentStateType } from '../state';
import {
  BOILERPLATE_PIPELINE,
  BOILERPLATE_PROCESSOR_COUNT,
  formatCompactCustomProcessorToc,
} from './pipeline_constants';
import { runLightweightIngestSimulateSummary } from './pipeline_simulate_summary';

interface ModifyPipelineToolOptions {
  esClient: ElasticsearchClient;
  samples: string[];
}

interface Operation {
  action: 'insert' | 'replace' | 'remove';
  index: number;
  processors?: unknown[];
}

const isBoilerplate = (idx: number) => idx >= 0 && idx < BOILERPLATE_PROCESSOR_COUNT;

interface OperationResult {
  processors: unknown[];
  applied: string[];
  warnings: string[];
}

const applyInsertOps = (processors: unknown[], operations: Operation[]): OperationResult => {
  const applied: string[] = [];
  const warnings: string[] = [];
  const insertAfterMap = new Map<number, unknown[]>();

  for (const { index: idx, processors: procs = [] } of operations) {
    const label = `insert@${idx}`;
    if (idx < -1) {
      warnings.push(
        `${label}: negative index ${idx} is not supported; only -1 (prepend) is allowed. Skipped.`
      );
      applied.push(`${label}: skipped (unsupported negative index)`);
    } else if (procs.length === 0) {
      applied.push(`${label}: skipped (no processors provided)`);
    } else {
      const existing = insertAfterMap.get(idx);
      if (existing) {
        existing.push(...procs);
      } else {
        insertAfterMap.set(idx, [...procs]);
      }
      applied.push(`${label}: inserted ${procs.length} processor(s) after index ${idx}`);
    }
  }

  const result: unknown[] = [];
  const prepend = insertAfterMap.get(-1);
  if (prepend) result.push(...prepend);
  for (let i = 0; i < processors.length; i++) {
    result.push(processors[i]);
    const after = insertAfterMap.get(i);
    if (after) result.push(...after);
  }
  for (const [idx, procs] of insertAfterMap.entries()) {
    if (idx >= processors.length) result.push(...procs);
  }
  return { processors: result, applied, warnings };
};

const applyReplaceOps = (processors: unknown[], operations: Operation[]): OperationResult => {
  const applied: string[] = [];
  const warnings: string[] = [];
  const replaceMap = new Map<number, unknown[]>();

  for (const { index: idx, processors: procs = [] } of operations) {
    const label = `replace@${idx}`;
    if (isBoilerplate(idx)) {
      warnings.push(
        `${label}: targets a boilerplate processor (indices 0–${
          BOILERPLATE_PROCESSOR_COUNT - 1
        } are pre-seeded). Skipped.`
      );
      applied.push(`${label}: skipped (boilerplate protected)`);
    } else if (procs.length === 0) {
      applied.push(`${label}: skipped (no processors provided)`);
    } else if (idx < 0 || idx >= processors.length) {
      applied.push(`${label}: skipped (index ${idx} out of range)`);
    } else {
      replaceMap.set(idx, procs);
      applied.push(`${label}: replaced with ${procs.length} processor(s)`);
    }
  }
  const result = processors.flatMap((p, i) => {
    const replacement = replaceMap.get(i);
    return replacement !== undefined ? replacement : [p];
  });
  return { processors: result, applied, warnings };
};

const applyRemoveOps = (processors: unknown[], operations: Operation[]): OperationResult => {
  const applied: string[] = [];
  const warnings: string[] = [];
  const removeSet = new Set<number>();

  for (const { index: idx } of operations) {
    const label = `remove@${idx}`;
    if (isBoilerplate(idx)) {
      warnings.push(
        `${label}: targets a boilerplate processor (indices 0–${
          BOILERPLATE_PROCESSOR_COUNT - 1
        } are pre-seeded). Skipped.`
      );
      applied.push(`${label}: skipped (boilerplate protected)`);
    } else if (idx < 0 || idx >= processors.length) {
      applied.push(`${label}: skipped (index ${idx} out of range)`);
    } else {
      removeSet.add(idx);
      applied.push(`${label}: removed`);
    }
  }
  const result = processors.filter((_, i) => !removeSet.has(i));
  return { processors: result, applied, warnings };
};

const ACTION_HANDLERS: Record<string, (p: unknown[], ops: Operation[]) => OperationResult> = {
  insert: applyInsertOps,
  replace: applyReplaceOps,
  remove: applyRemoveOps,
};

const applyOperations = (processors: unknown[], operations: Operation[]): OperationResult => {
  if (operations.length === 0) {
    return { processors, applied: [], warnings: [] };
  }

  const action = operations[0].action;
  const mixed = operations.filter((op) => op.action !== action);
  if (mixed.length > 0) {
    throw new Error(
      `All operations must use the same action type. Expected "${action}" but found: ${mixed
        .map((op) => `"${op.action}"@${op.index}`)
        .join(', ')}`
    );
  }

  const handler = ACTION_HANDLERS[action];
  if (handler) {
    return handler(processors, operations);
  }

  return { processors, applied: [], warnings: [] };
};

export function modifyPipelineTool(options: ModifyPipelineToolOptions): DynamicStructuredTool {
  const { esClient, samples } = options;
  const schema = z.object({
    operations: z
      .array(
        z.object({
          action: z
            .enum(['insert', 'replace', 'remove'])
            .describe('The mutation to perform on the processors array.'),
          index: z
            .number()
            .describe(
              'Processor position (0-based) in the ORIGINAL pipeline snapshot (before this batch). ' +
                'For insert: processors are placed AFTER this position. Use -1 to insert at position 0 (beginning of the pipeline). ' +
                'For replace/remove: the processor at this position is targeted.'
            ),
          processors: z
            .array(z.any())
            .optional()
            .describe(
              'Processor objects for insert/replace actions. Required for insert and replace, ignored for remove.'
            ),
        })
      )
      .refine(
        (ops) => {
          const actions = new Set(ops.map((op) => op.action));
          return actions.size <= 1;
        },
        {
          message:
            'All operations in a single call must use the same action type (insert, replace, or remove). Split mixed-action changes into separate modify_pipeline calls.',
        }
      )
      .describe(
        'Operations to apply to the pipeline processors array — all must be the same action type (insert only, replace only, or remove only). ' +
          `Every index refers to the ORIGINAL pipeline snapshot before this call. ` +
          `The first ${BOILERPLATE_PROCESSOR_COUNT} processors (ecs.version, message rename/remove) are boilerplate — avoid modifying them.`
      ),
  });

  return new DynamicStructuredTool({
    name: 'modify_pipeline',
    description:
      'Modify the current ingest pipeline by inserting, replacing, or removing processors. ' +
      'All operations in a single call MUST be the same action type (all inserts, all replaces, or all removes). ' +
      'All indices refer to the ORIGINAL pipeline snapshot before the call — resolved in a single pass with no index drift. ' +
      'After each call, runs a quick ingest simulation on all samples (not persisted) and returns success/failure summary plus example outputs. ' +
      'Also returns a compact list of custom processors (after boilerplate). ' +
      'The pipeline is automatically initialized with boilerplate processors (ecs.version, message->event.original, on_failure) if empty.',
    schema,
    func: async (
      input: z.infer<typeof schema>,
      _runManager?: CallbackManagerForToolRun,
      config?: ToolRunnableConfig
    ) => {
      const state = getCurrentTaskInput<AutomaticImportAgentStateType>();
      let currentPipeline = state.current_pipeline;

      if (!currentPipeline?.processors || currentPipeline.processors.length === 0) {
        currentPipeline = { ...BOILERPLATE_PIPELINE };
      }

      const processors = currentPipeline.processors ?? BOILERPLATE_PIPELINE.processors;
      const processorsBefore = processors.length;
      const {
        processors: updatedProcessors,
        applied,
        warnings,
      } = applyOperations(processors, input.operations as Operation[]);

      const updatedPipeline = {
        ...currentPipeline,
        processors: updatedProcessors,
      };

      const compactToc = formatCompactCustomProcessorToc(
        updatedProcessors as Array<Record<string, unknown>>,
        BOILERPLATE_PROCESSOR_COUNT
      );

      const simulateSummary = await runLightweightIngestSimulateSummary({
        esClient,
        pipeline: updatedPipeline as estypes.IngestPipeline,
        samples,
        title: 'Quick simulate after this change (all samples, not persisted):',
      });

      const lines = [
        `Pipeline modified: ${processorsBefore} → ${updatedProcessors.length} processors`,
        '',
        'Operations applied:',
        ...applied.map((a) => `  - ${a}`),
      ];

      if (warnings.length > 0) {
        lines.push('', '⚠ WARNINGS:', ...warnings.map((w) => `  - ${w}`));
      }

      lines.push(
        '',
        `Total processors: ${updatedProcessors.length} (first ${BOILERPLATE_PROCESSOR_COUNT} are boilerplate)`,
        '',
        'Custom processors (compact TOC):',
        compactToc,
        '',
        simulateSummary
      );
      const response = lines.join('\n');

      return new Command({
        update: {
          current_pipeline: updatedPipeline,
          messages: [
            new ToolMessage({
              content: response,
              tool_call_id: config?.toolCall?.id ?? '',
            }),
          ],
        },
      });
    },
  });
}
