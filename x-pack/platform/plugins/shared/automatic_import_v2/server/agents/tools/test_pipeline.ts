/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from '@kbn/zod';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';

interface DocTemplate {
  _index: string;
  _id: string;
  _source: {
    message: string;
    [key: string]: unknown;
  };
}

function formatSample(sample: string): DocTemplate {
  return {
    _index: 'index',
    _id: 'id',
    _source: { message: sample },
  };
}

/**
 * Creates a lightweight pipeline simulation tool for iterative debugging.
 * Unlike validate_ingest_pipeline, this tool does NOT update agent state —
 * it simply runs the simulate API and returns results. Designed for quick
 * test-fix cycles: test a grok pattern, a kv processor, or a small chain
 * of processors against 1-3 sample docs.
 *
 * @param esClient - Elasticsearch client for simulating the pipeline
 * @param samples - Array of all available log samples (used as fallback when no docs provided)
 */
export function testPipelineTool(
  esClient: ElasticsearchClient,
  samples: string[]
): DynamicStructuredTool {
  // Keep the schema maximally permissive so that LangChain's output parser
  // never rejects model-generated arguments with an OUTPUT_PARSING_FAILURE.
  // All real validation happens inside the tool function, where we can
  // return descriptive error strings instead of crashing the agent.
  const schema = z.object({
    processors: z
      .any()
      .describe(
        'Array of ingest processors to test. Example: [{"grok": {"field": "message", "patterns": ["%{TIMESTAMP_ISO8601:timestamp} %{GREEDYDATA:msg}"]}}]'
      ),
    on_failure: z.any().optional().describe('Optional on_failure handlers for the test pipeline.'),
    docs: z
      .any()
      .optional()
      .describe(
        'Specific raw log strings to test against. If omitted, the first 3 available samples are used. Keep this small (1-5) especially when verbose is true.'
      ),
    verbose: z
      .any()
      .optional()
      .describe(
        'When true, returns per-processor output for each document. Very detailed — only use with a small number of docs (1-3).'
      ),
    return_errors_only: z
      .any()
      .optional()
      .describe(
        'When true (default), only returns errors and failures. When false, returns full results including successful document outputs.'
      ),
  });

  return new DynamicStructuredTool({
    name: 'test_pipeline',
    description:
      'Lightweight processor simulation for iterative debugging. ' +
      'Pass one or more processors (not the full pipeline) and the tool wraps them into a pipeline and simulates against a small subset of docs. ' +
      'Use this to quickly test a grok pattern, debug a kv processor, or verify a small chain of processors. ' +
      'Supports verbose mode (per-processor step output) and return_errors_only mode (compact error-only output). ' +
      'For final validation of the complete pipeline that persists results to state, use validate_ingest_pipeline instead.',
    schema,
    func: async (input) => {
      const {
        processors: rawProcessors,
        on_failure: rawOnFailure,
        docs: rawDocsInput,
        verbose: rawVerbose,
        return_errors_only: rawErrorsOnly,
      } = input;

      const verbose = rawVerbose === true || rawVerbose === 'true';
      const errorsOnly = rawErrorsOnly !== false && rawErrorsOnly !== 'false';

      let processors: unknown = rawProcessors;
      if (typeof processors === 'string') {
        try {
          processors = JSON.parse(processors);
        } catch (e) {
          return JSON.stringify({
            error: `Failed to parse processors JSON: ${(e as Error).message}`,
          });
        }
      }

      if (!Array.isArray(processors) || processors.length === 0) {
        return JSON.stringify({
          error:
            'processors must be a non-empty array of processor objects. ' +
            'Example: [{"grok": {"field": "message", "patterns": ["%{GREEDYDATA:msg}"]}}]',
        });
      }

      let onFailure: estypes.IngestProcessorContainer[] | undefined;
      if (rawOnFailure != null) {
        let parsed = rawOnFailure;
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch (e) {
            return JSON.stringify({
              error: `Failed to parse on_failure JSON: ${(e as Error).message}`,
            });
          }
        }
        if (Array.isArray(parsed)) {
          onFailure = parsed as estypes.IngestProcessorContainer[];
        }
      }

      let inputDocs: string[] | undefined;
      if (rawDocsInput != null) {
        if (Array.isArray(rawDocsInput)) {
          inputDocs = rawDocsInput.map((d: unknown) =>
            typeof d === 'string' ? d : JSON.stringify(d)
          );
        } else if (typeof rawDocsInput === 'string') {
          inputDocs = [rawDocsInput];
        } else {
          return JSON.stringify({
            error: `docs must be an array of strings, got ${typeof rawDocsInput}`,
          });
        }
      }

      const rawDocs: string[] = inputDocs ?? samples.slice(0, 3);
      if (rawDocs.length === 0) {
        return JSON.stringify({ error: 'No documents to test against.' });
      }

      const formattedDocs = rawDocs.map((doc) => formatSample(doc));

      const pipeline: estypes.IngestPipeline = {
        processors: processors as estypes.IngestProcessorContainer[],
        ...(onFailure ? { on_failure: onFailure } : {}),
      };

      try {
        const response: estypes.IngestSimulateResponse = await esClient.ingest.simulate({
          docs: formattedDocs,
          pipeline,
          verbose,
        });

        const errors: Array<{ doc_index: number; error: string; sample_preview: string }> = [];
        const successes: Array<{ doc_index: number; source: unknown }> = [];

        response.docs.forEach((doc, index) => {
          if (verbose) {
            const verboseDoc = doc as unknown as {
              processor_results?: Array<{
                processor_type?: string;
                tag?: string;
                status?: string;
                doc?: { _source?: Record<string, unknown> };
                error?: { type?: string; reason?: string };
              }>;
            };
            if (verboseDoc.processor_results) {
              const failedSteps = verboseDoc.processor_results.filter(
                (step) => step.error || step.status === 'error'
              );
              if (failedSteps.length > 0) {
                errors.push({
                  doc_index: index,
                  error: JSON.stringify(
                    failedSteps.map((s) => ({
                      processor: s.processor_type,
                      tag: s.tag,
                      error: s.error?.reason ?? s.error,
                    }))
                  ),
                  sample_preview: rawDocs[index].substring(0, 200),
                });
              } else if (!errorsOnly) {
                successes.push({
                  doc_index: index,
                  source: verboseDoc.processor_results,
                });
              }
              return;
            }
          }

          if (!doc) {
            errors.push({
              doc_index: index,
              error: 'Document was dropped by the pipeline',
              sample_preview: rawDocs[index].substring(0, 200),
            });
          } else if (doc.doc?._source?.error) {
            errors.push({
              doc_index: index,
              error:
                typeof doc.doc._source.error === 'string'
                  ? doc.doc._source.error
                  : JSON.stringify(doc.doc._source.error),
              sample_preview: rawDocs[index].substring(0, 200),
            });
          } else if (!errorsOnly && doc.doc?._source) {
            successes.push({
              doc_index: index,
              source: doc.doc._source,
            });
          }
        });

        const result: Record<string, unknown> = {
          total_docs: rawDocs.length,
          errors_count: errors.length,
          success_count: rawDocs.length - errors.length,
        };

        if (errors.length > 0) {
          result.errors = errors;
        }

        if (!errorsOnly && successes.length > 0) {
          result.successful_docs = successes;
        }

        if (errors.length === 0) {
          result.message = `All ${rawDocs.length} test documents processed successfully.`;
        }

        return JSON.stringify(result);
      } catch (simulateError) {
        return JSON.stringify({
          error: `Pipeline simulation failed: ${(simulateError as Error).message}`,
        });
      }
    },
  });
}
