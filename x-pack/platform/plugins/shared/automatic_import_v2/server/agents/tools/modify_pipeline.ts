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
import { z } from '@kbn/zod';
import type { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';

import type { AutomaticImportAgentState } from '../state';
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

const checksEventOriginalMutation = (processor: unknown): string | null => {
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

const applyOperations = (
  processors: unknown[],
  operations: Operation[]
): { processors: unknown[]; applied: string[]; warnings: string[] } => {
  const result = [...processors];
  const applied: string[] = [];
  const warnings: string[] = [];
  let offset = 0;

  for (const op of operations) {
    const adjustedIndex = op.index + offset;

    if (
      (op.action === 'replace' || op.action === 'remove') &&
      op.index >= 0 &&
      op.index < BOILERPLATE_PROCESSOR_COUNT
    ) {
      warnings.push(
        `${op.action}@${op.index}: targets a boilerplate processor (indices 0-${
          BOILERPLATE_PROCESSOR_COUNT - 1
        } are pre-seeded). ` +
          `Skipped — do not modify ecs.version, message→event.original rename, or message remove.`
      );
      applied.push(`${op.action}@${op.index}: skipped (boilerplate processor is protected)`);
      continue;
    }

    if (op.action === 'insert' && op.processors) {
      for (const proc of op.processors) {
        const mutationWarning = checksEventOriginalMutation(proc);
        if (mutationWarning) {
          warnings.push(
            `insert@${op.index}: processor ${mutationWarning}. ` +
              `event.original is read-only and must never be modified, renamed, removed, or gsub'd.`
          );
        }
      }
    }
    if (op.action === 'replace' && op.processors) {
      for (const proc of op.processors) {
        const mutationWarning = checksEventOriginalMutation(proc);
        if (mutationWarning) {
          warnings.push(
            `replace@${op.index}: processor ${mutationWarning}. ` +
              `event.original is read-only and must never be modified, renamed, removed, or gsub'd.`
          );
        }
      }
    }

    switch (op.action) {
      case 'insert': {
        const items = op.processors ?? [];
        if (items.length === 0) {
          applied.push(`insert@${op.index}: skipped (no processors provided)`);
          break;
        }
        const insertAt = adjustedIndex + 1;
        const clampedInsertAt = Math.max(0, Math.min(insertAt, result.length));
        result.splice(clampedInsertAt, 0, ...items);
        applied.push(
          `insert@${op.index}: inserted ${items.length} processor(s) after index ${op.index}`
        );
        offset += items.length;
        break;
      }
      case 'replace': {
        const items = op.processors ?? [];
        if (items.length === 0) {
          applied.push(`replace@${op.index}: skipped (no processors provided)`);
          break;
        }
        if (adjustedIndex < 0 || adjustedIndex >= result.length) {
          applied.push(`replace@${op.index}: skipped (index out of range)`);
          break;
        }
        result.splice(adjustedIndex, 1, ...items);
        applied.push(
          `replace@${op.index}: replaced processor at index ${op.index} with ${items.length} processor(s)`
        );
        offset += items.length - 1;
        break;
      }
      case 'remove': {
        if (adjustedIndex < 0 || adjustedIndex >= result.length) {
          applied.push(`remove@${op.index}: skipped (index out of range)`);
          break;
        }
        result.splice(adjustedIndex, 1);
        applied.push(`remove@${op.index}: removed processor at index ${op.index}`);
        offset -= 1;
        break;
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
              'Processor index (0-based). For insert: processors are inserted AFTER this index. ' +
                'Use -1 to insert at position 0 (beginning of the pipeline). ' +
                'For replace/remove: the processor at this index is targeted.'
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
          `Every index is interpreted against the pipeline BEFORE this batch (not the array mid-batch). ` +
          `Operations run in order; the implementation tracks an offset so removes/inserts/replaces compose correctly. ` +
          `Prefer batching several related operations in one call (e.g. parsing + first renames, or a block of ECS renames) to save tokens — ` +
          `typically 2–4 logical steps per call, not one processor per call and not the entire pipeline in a single huge batch unless you are confident. ` +
          `The first ${BOILERPLATE_PROCESSOR_COUNT} processors (ecs.version, message rename/remove) are boilerplate — avoid modifying them unless you need to.`
      ),
  });

  return new DynamicStructuredTool({
    name: 'modify_pipeline',
    description:
      'Modify the current ingest pipeline by inserting, replacing, or removing processors. ' +
      'Accepts a batch of operations applied in order; all indices refer to the pipeline BEFORE the batch, with internal offset correction. ' +
      'After each call, runs a quick ingest simulation on all samples (not persisted) and returns success/failure summary plus example outputs. ' +
      'Also returns a compact list of custom processors (after boilerplate). ' +
      'The pipeline is automatically initialized with boilerplate processors (ecs.version, message->event.original, on_failure) if empty.',
    schema,
    func: async (
      input: z.infer<typeof schema>,
      _runManager?: CallbackManagerForToolRun,
      config?: ToolRunnableConfig
    ) => {
      const state = getCurrentTaskInput<z.infer<typeof AutomaticImportAgentState>>();
      let currentPipeline = state.current_pipeline;

      if (!currentPipeline?.processors || currentPipeline.processors.length === 0) {
        currentPipeline = { ...BOILERPLATE_PIPELINE };
      }

      const processorsBefore = currentPipeline.processors.length;
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
