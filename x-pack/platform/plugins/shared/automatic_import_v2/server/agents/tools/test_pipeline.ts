/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from '@kbn/zod';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import type { ToolRunnableConfig } from '@langchain/core/tools';
import type { estypes } from '@elastic/elasticsearch';

import { BOILERPLATE_PIPELINE } from './pipeline_constants';

const MAX_SUCCESSFUL_OUTPUTS = 2;
const MAX_ERROR_GROUPS_DEFAULT = 5;
const MAX_ERROR_GROUPS_ERRORS_ONLY = 10;
const MAX_VERBOSE_SAMPLES = 2;
const SAMPLE_TRUNCATE_LENGTH = 200;

const STRIPPED_OUTPUT_FIELDS = new Set(['event.original', 'ecs.version']);

interface TestPipelineToolOptions {
  esClient: ElasticsearchClient;
  samples: string[];
}

interface DocTemplate {
  _index: string;
  _id: string;
  _source: {
    message: string;
    [key: string]: unknown;
  };
}

const formatDoc = (sample: string): DocTemplate => ({
  _index: 'index',
  _id: 'id',
  _source: { message: sample },
});

interface FailedSample {
  sampleIndex: number;
  sample: string;
  error: string;
}

interface ErrorGroup {
  error: string;
  count: number;
  exampleSample: string;
}

const groupErrors = (failedSamples: FailedSample[], maxGroups: number): ErrorGroup[] => {
  const groups = new Map<string, { count: number; example: string }>();

  for (const { error, sample } of failedSamples) {
    const existing = groups.get(error);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(error, { count: 1, example: sample.substring(0, SAMPLE_TRUNCATE_LENGTH) });
    }
  }

  return [...groups.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, maxGroups)
    .map(([error, { count, example }]) => ({
      error,
      count,
      exampleSample: example,
    }));
};

const stripBoilerplateFields = (source: Record<string, unknown>): Record<string, unknown> => {
  const result = { ...source };
  for (const field of STRIPPED_OUTPUT_FIELDS) {
    const dotIdx = field.indexOf('.');
    if (dotIdx !== -1) {
      const root = field.substring(0, dotIdx);
      const child = field.substring(dotIdx + 1);
      const rootObj = result[root];
      if (rootObj != null && typeof rootObj === 'object' && !Array.isArray(rootObj)) {
        const copy = { ...(rootObj as Record<string, unknown>) };
        delete copy[child];
        if (Object.keys(copy).length === 0) {
          delete result[root];
        } else {
          result[root] = copy;
        }
      }
    } else {
      delete result[field];
    }
  }
  return result;
};

const formatVerboseResults = (
  processorResults: estypes.IngestPipelineProcessorResult[]
): string => {
  const lines: string[] = [];
  for (let i = 0; i < processorResults.length; i++) {
    const pr = processorResults[i];
    const type = pr.processor_type ?? 'unknown';
    const tag = pr.tag ? ` (${pr.tag})` : '';
    const ok = pr.status === 'success';
    const marker = ok ? '✓' : '✗';

    let detail = '';
    if (!ok && pr.error?.reason) {
      detail = ` — ${pr.error.reason.substring(0, 200)}`;
    }

    lines.push(`  [${i}] ${type}${tag}: ${marker}${detail}`);

    const isLastBeforeFailure =
      ok && i < processorResults.length - 1 && processorResults[i + 1].status !== 'success';
    const isLastOverall = i === processorResults.length - 1 && ok;

    if (isLastBeforeFailure || isLastOverall) {
      const src = pr.doc?._source as Record<string, unknown> | undefined;
      if (src) {
        const stripped = stripBoilerplateFields(src);
        const allKeys = Object.keys(stripped);
        const shown = allKeys.slice(0, 10);
        if (shown.length > 0) {
          lines.push(
            `        output fields: ${shown.join(', ')}${
              allKeys.length > 10 ? ` (+${allKeys.length - 10} more)` : ''
            }`
          );
        }
      }
    }
  }
  return lines.join('\n');
};

export function testPipelineTool(options: TestPipelineToolOptions): DynamicStructuredTool {
  const { esClient, samples } = options;

  const schema = z.object({
    processors: z
      .array(z.any())
      .min(1)
      .describe(
        'Processor object(s) to simulate in isolation. The tool prepends the standard boilerplate ' +
          '(ecs.version, message→event.original, remove message) then runs these processors. ' +
          'Does NOT read the pipeline from shared state — use this to try alternate grok/kv/dissect configs ' +
          'without committing via modify_pipeline.'
      ),
    errors_only: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'When true, only returns error information (no successful output examples). ' +
          'Use when you only need to check whether errors are resolved.'
      ),
    verbose: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'When true, runs a verbose simulation on a few samples showing per-processor output. ' +
          'Use as a last resort to see exactly which processor is failing and why. ' +
          'Adds latency — only enable when stuck debugging.'
      ),
  });

  return new DynamicStructuredTool({
    name: 'test_pipeline',
    description:
      'Simulate a scratch pipeline (boilerplate + the processors you pass) against ALL log samples. ' +
      'Does NOT read or update shared state — use when stuck on a pattern to compare candidate processors ' +
      '(e.g. alternate grok patterns) before applying the winner with modify_pipeline. ' +
      'Primary workflow: build step-by-step with modify_pipeline (use its TOC for feedback), ' +
      'then validate_pipeline when the pipeline is ready.',
    schema,
    func: async (
      input: z.infer<typeof schema>,
      _runManager?: CallbackManagerForToolRun,
      _config?: ToolRunnableConfig
    ) => {
      const { processors: testProcessors, errors_only: errorsOnly, verbose } = input;

      if (!samples || samples.length === 0) {
        return 'No samples available for testing.';
      }

      const scratchPipeline: estypes.IngestPipeline = {
        processors: [...BOILERPLATE_PIPELINE.processors, ...testProcessors],
        ...(BOILERPLATE_PIPELINE.on_failure ? { on_failure: BOILERPLATE_PIPELINE.on_failure } : {}),
      };

      const docs = samples.map((sample) => formatDoc(sample));

      let response: estypes.IngestSimulateResponse;
      try {
        response = await esClient.ingest.simulate({
          docs,
          pipeline: scratchPipeline,
        });
      } catch (simulateError) {
        return `Pipeline simulation failed: ${(simulateError as Error).message}`;
      }

      const failedSamples: FailedSample[] = [];
      const successfulOutputs: Array<Record<string, unknown>> = [];
      let successfulCount = 0;

      response.docs.forEach((doc, index) => {
        if (!doc) {
          failedSamples.push({
            sampleIndex: index,
            sample: samples[index],
            error: 'Document was dropped by the pipeline',
          });
        } else if (doc.doc?._source?.error) {
          const errorDetail =
            typeof doc.doc._source.error === 'string'
              ? doc.doc._source.error
              : JSON.stringify(doc.doc._source.error);
          failedSamples.push({
            sampleIndex: index,
            sample: samples[index],
            error: errorDetail,
          });
        } else if (doc.doc?._source) {
          successfulCount++;
          if (successfulOutputs.length < MAX_SUCCESSFUL_OUTPUTS) {
            successfulOutputs.push(
              stripBoilerplateFields(doc.doc._source as Record<string, unknown>)
            );
          }
        }
      });

      const totalSamples = samples.length;
      const failedCount = failedSamples.length;
      const successRate = totalSamples > 0 ? (successfulCount / totalSamples) * 100 : 0;

      const lines: string[] = [
        `Scratch pipeline: standard boilerplate + ${testProcessors.length} processor(s) you provided (not read from shared state).`,
      ];

      if (failedCount === 0) {
        lines.push(`Test results: ALL ${totalSamples} samples succeeded (100%)`);
      } else {
        lines.push(
          `Test results: ${successfulCount}/${totalSamples} succeeded (${successRate.toFixed(
            1
          )}%), ${failedCount} failed`
        );
      }

      if (!errorsOnly && successfulOutputs.length > 0) {
        lines.push('');
        lines.push(`--- Successful output (${successfulOutputs.length} of ${successfulCount}) ---`);
        for (const output of successfulOutputs) {
          lines.push(JSON.stringify(output, null, 2));
        }
      }

      if (failedCount > 0) {
        const maxGroups = errorsOnly ? MAX_ERROR_GROUPS_ERRORS_ONLY : MAX_ERROR_GROUPS_DEFAULT;
        const errorGroups = groupErrors(failedSamples, maxGroups);
        const uniqueErrorCount = new Set(failedSamples.map((f) => f.error)).size;

        lines.push('');
        lines.push(
          `--- Errors (${failedCount} failures, ${uniqueErrorCount} unique error types) ---`
        );
        for (const group of errorGroups) {
          lines.push(`[${group.count}x] ${group.error}`);
          lines.push(`  example: ${group.exampleSample}`);
        }
        if (uniqueErrorCount > maxGroups) {
          lines.push(`  ... and ${uniqueErrorCount - maxGroups} more error types`);
        }
      }

      if (verbose) {
        const verboseIndices: number[] = [];

        for (const failed of failedSamples) {
          if (verboseIndices.length >= MAX_VERBOSE_SAMPLES) break;
          verboseIndices.push(failed.sampleIndex);
        }
        if (verboseIndices.length < MAX_VERBOSE_SAMPLES && successfulCount > 0) {
          for (
            let i = 0;
            i < response.docs.length && verboseIndices.length < MAX_VERBOSE_SAMPLES;
            i++
          ) {
            if (
              !verboseIndices.includes(i) &&
              response.docs[i]?.doc?._source &&
              !response.docs[i]?.doc?._source?.error
            ) {
              verboseIndices.push(i);
            }
          }
        }

        if (verboseIndices.length > 0) {
          const verboseDocs = verboseIndices.map((idx) => formatDoc(samples[idx]));

          try {
            const verboseResponse = await esClient.ingest.simulate({
              docs: verboseDocs,
              pipeline: scratchPipeline,
              verbose: true,
            });

            lines.push('');
            lines.push(`--- Verbose: per-processor output (${verboseIndices.length} samples) ---`);

            for (let i = 0; i < verboseResponse.docs.length; i++) {
              const sampleIdx = verboseIndices[i];
              const isFailing = failedSamples.some((f) => f.sampleIndex === sampleIdx);
              const samplePreview = samples[sampleIdx].substring(0, SAMPLE_TRUNCATE_LENGTH);

              lines.push('');
              lines.push(
                `Sample ${sampleIdx + 1} (${isFailing ? 'FAILING' : 'OK'}): ${samplePreview}${
                  samples[sampleIdx].length > SAMPLE_TRUNCATE_LENGTH ? '...' : ''
                }`
              );

              const processorResults = verboseResponse.docs[i]?.processor_results;
              if (processorResults && processorResults.length > 0) {
                lines.push(formatVerboseResults(processorResults));
              } else {
                lines.push('  (no processor results available)');
              }
            }
          } catch (verboseError) {
            lines.push('');
            lines.push(`Verbose simulation failed: ${(verboseError as Error).message}`);
          }
        }
      }

      return lines.join('\n');
    },
  });
}
