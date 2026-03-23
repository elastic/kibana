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
  getProcessorType,
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

const PROTECTED_FIELD = 'event.original';

const detectEventOriginalMutation = (processor: unknown): string | null => {
  if (processor == null || typeof processor !== 'object') return null;
  const proc = processor as Record<string, unknown>;
  const type = getProcessorType(proc);
  const config = proc[type] as Record<string, unknown> | undefined;
  if (!config) return null;

  if (type === 'rename' && config.field === PROTECTED_FIELD) {
    return `${type}: renames ${PROTECTED_FIELD} (read-only — must be preserved)`;
  }
  if (type === 'remove') {
    const field = config.field;
    const fields = Array.isArray(field) ? field : [field];
    if (fields.includes(PROTECTED_FIELD)) {
      return `${type}: removes ${PROTECTED_FIELD} (read-only — must be preserved)`;
    }
  }
  if (type === 'gsub' && config.field === PROTECTED_FIELD) {
    return `${type}: modifies ${PROTECTED_FIELD} (read-only — must be preserved)`;
  }
  if (type === 'set' && config.field === PROTECTED_FIELD) {
    return `${type}: overwrites ${PROTECTED_FIELD} (read-only — must be preserved)`;
  }
  return null;
};

/**
 * Applies a batch of operations against the original processor array in a single pass.
 * All indices reference the ORIGINAL snapshot — no sequential offset tracking.
 *
 * Resolution order:
 *  1. Classify each operation into remove/replace/insert maps keyed by original index.
 *  2. Single-pass build: iterate the original array, emitting replacements / skipping removes /
 *     appending inserts at the correct positions.
 */
const applyOperations = (
  processors: unknown[],
  operations: Operation[]
): { processors: unknown[]; applied: string[]; warnings: string[] } => {
  const applied: string[] = [];
  const warnings: string[] = [];

  const removeIndices = new Set<number>();
  const replaceMap = new Map<number, unknown[]>();
  const insertAfterMap = new Map<number, unknown[][]>();

  for (const op of operations) {
    const idx = op.index;
    const label = `${op.action}@${idx}`;

    if (
      (op.action === 'replace' || op.action === 'remove') &&
      idx >= 0 &&
      idx < BOILERPLATE_PROCESSOR_COUNT
    ) {
      warnings.push(
        `${label}: targets a boilerplate processor (indices 0–${
          BOILERPLATE_PROCESSOR_COUNT - 1
        } are pre-seeded). ` +
          `Skipped — do not modify ecs.version, message→event.original rename, or message remove.`
      );
      applied.push(`${label}: skipped (boilerplate protected)`);
      continue;
    }

    if ((op.action === 'insert' || op.action === 'replace') && op.processors) {
      for (const proc of op.processors) {
        const mutationWarning = detectEventOriginalMutation(proc);
        if (mutationWarning) {
          warnings.push(
            `${label}: processor ${mutationWarning}. ` +
              `event.original is read-only and must never be modified, renamed, removed, or gsub'd.`
          );
        }
      }
    }

    switch (op.action) {
      case 'remove': {
        if (idx < 0 || idx >= processors.length) {
          applied.push(`${label}: skipped (index ${idx} out of range)`);
          break;
        }
        if (removeIndices.has(idx)) {
          warnings.push(`${label}: duplicate remove at index ${idx} — already scheduled`);
        }
        removeIndices.add(idx);
        applied.push(`${label}: removed`);
        break;
      }
      case 'replace': {
        const items = op.processors ?? [];
        if (items.length === 0) {
          applied.push(`${label}: skipped (no processors provided)`);
          break;
        }
        if (idx < 0 || idx >= processors.length) {
          applied.push(`${label}: skipped (index ${idx} out of range)`);
          break;
        }
        if (replaceMap.has(idx)) {
          warnings.push(`${label}: duplicate replace at index ${idx} — last one wins`);
        }
        replaceMap.set(idx, items);
        applied.push(`${label}: replaced with ${items.length} processor(s)`);
        break;
      }
      case 'insert': {
        const items = op.processors ?? [];
        if (items.length === 0) {
          applied.push(`${label}: skipped (no processors provided)`);
          break;
        }
        const existing = insertAfterMap.get(idx);
        if (existing) {
          existing.push(items);
        } else {
          insertAfterMap.set(idx, [items]);
        }
        applied.push(`${label}: inserted ${items.length} processor(s) after index ${idx}`);
        break;
      }
    }
  }

  for (const idx of removeIndices) {
    if (replaceMap.has(idx)) {
      warnings.push(
        `Conflict at index ${idx}: remove + replace — replace takes precedence`
      );
      removeIndices.delete(idx);
    }
  }

  const result: unknown[] = [];

  const prependGroups = insertAfterMap.get(-1);
  if (prependGroups) {
    for (const group of prependGroups) {
      result.push(...group);
    }
  }

  for (let i = 0; i < processors.length; i++) {
    if (removeIndices.has(i)) {
      // removed — skip
    } else if (replaceMap.has(i)) {
      result.push(...replaceMap.get(i)!);
    } else {
      result.push(processors[i]);
    }

    const groups = insertAfterMap.get(i);
    if (groups) {
      for (const group of groups) {
        result.push(...group);
      }
    }
  }

  for (const [idx, groups] of insertAfterMap.entries()) {
    if (idx >= processors.length) {
      for (const group of groups) {
        result.push(...group);
      }
    }
  }

  return { processors: result, applied, warnings };
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
      .describe(
        'Batch of operations to apply to the pipeline processors array. ' +
          `Every index refers to the ORIGINAL pipeline snapshot before this batch — all operations are resolved in a single pass with no index drift between operations. ` +
          `Prefer batching 2–4 logical steps per call to save tokens. ` +
          `The first ${BOILERPLATE_PROCESSOR_COUNT} processors (ecs.version, message rename/remove) are boilerplate — avoid modifying them.`
      ),
  });

  return new DynamicStructuredTool({
    name: 'modify_pipeline',
    description:
      'Modify the current ingest pipeline by inserting, replacing, or removing processors. ' +
      'Accepts a batch of operations; all indices refer to the ORIGINAL pipeline snapshot before the batch — resolved in a single pass with no index drift between operations. ' +
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
      } = applyOperations(currentPipeline.processors, input.operations as Operation[]);

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
              tool_call_id: config?.toolCall?.id as string,
            }),
          ],
        },
      });
    },
  });
}
