/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { node } from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import kbnDatemath from '@kbn/datemath';
import { tags } from '@kbn/scout';
import type { ScoutTestConfig } from '@kbn/scout';
import type { KbnClient } from '@kbn/scout';
import type { StreamlangDSL } from '@kbn/streamlang';
import type { ProcessingSimulationResponse, FlattenRecord } from '@kbn/streams-schema';
import { extractGrokPatternDangerouslySlow } from '@kbn/grok-heuristics';
import { groupMessagesByPattern as groupMessagesByDissectPattern } from '@kbn/dissect-heuristics';
import { evaluate } from '../src/evaluate';
import {
  PIPELINE_SUGGESTION_DATASETS,
  type PipelineSuggestionEvaluationExample,
} from './pipeline_suggestion_datasets';
import {
  calculatePipelineSuggestionMetrics,
  type PipelineSuggestionMetrics,
} from './pipeline_suggestion_metrics';

/**
 * Pipeline suggestion quality evaluation.
 *
 * Tests the quality of complete pipeline generation (parsing + normalization)
 * using real LogHub log samples.
 *
 * @tags @local-stateful-classic @cloud-stateful-classic
 */

evaluate.describe.configure({ timeout: 600_000 });

evaluate.describe('Pipeline suggestion quality evaluation', () => {
  const from = kbnDatemath.parse('now-2m')!;
  const to = kbnDatemath.parse('now')!;

  function getSharedArgs({ config }: { config: ScoutTestConfig }) {
    const esUrl = new URL(config.hosts.elasticsearch);
    const kbnUrl = new URL(config.hosts.kibana);

    esUrl.username = config.auth.username;
    esUrl.password = config.auth.password;

    kbnUrl.username = config.auth.username;
    kbnUrl.password = config.auth.password;

    return [
      `--from=${from.toISOString()}`,
      `--to=${to.toISOString()}`,
      `--kibana=${kbnUrl.toString()}`,
      `--target=${esUrl.toString()}`,
      '--assume-package-version=9.2.0',
      '--workers=1',
    ];
  }

  const synthtraceScript = Path.join(REPO_ROOT, 'scripts/synthtrace.js');

  /**
   * Flatten nested objects into dot notation.
   * E.g., { attributes: { filepath: 'Apache.log' } } => { 'attributes.filepath': 'Apache.log' }
   */
  function flattenObject(obj: any, prefix = ''): FlattenRecord {
    const flattened: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }

    return flattened;
  }

  /**
   * Index logs for a specific system using synthtrace.
   */
  async function indexSystemLogs({ config, system }: { config: ScoutTestConfig; system: string }) {
    await node(
      require.resolve(synthtraceScript),
      [
        'sample_logs',
        ...getSharedArgs({ config }),
        `--scenarioOpts.systems="${system}"`,
        '--scenarioOpts.rpm=100',
        '--scenarioOpts.streamType=wired',
      ],
      { stdio: 'inherit' }
    );
  }

  /**
   * Fetch sample documents from a stream.
   */
  async function fetchSampleDocuments(
    esClient: any,
    streamName: string,
    count: number
  ): Promise<FlattenRecord[]> {
    const response = await esClient.search({
      index: streamName,
      size: count,
      sort: [{ '@timestamp': { order: 'desc' } }],
    });

    const hits = response.hits?.hits || [];
    // Flatten nested objects to dot notation for the API
    return hits.map((hit: any) => flattenObject(hit._source));
  }

  /**
   * Extract patterns from documents (client-side).
   */
  function extractPatterns(documents: FlattenRecord[]): {
    grok: {
      fieldName: string;
      patternGroups: Array<{
        messages: string[];
        nodes: any[];
      }>;
    } | null;
    dissect: {
      fieldName: string;
      messages: string[];
    } | null;
  } {
    const fieldName = 'body.text';
    const messages = documents
      .map((doc) => doc[fieldName])
      .filter((msg): msg is string => typeof msg === 'string');

    if (messages.length === 0) {
      return { grok: null, dissect: null };
    }

    // Try grok pattern extraction
    let grokResult = null;
    try {
      const patternNodes = extractGrokPatternDangerouslySlow(messages);
      if (patternNodes && patternNodes.length > 0) {
        grokResult = {
          fieldName,
          patternGroups: [
            {
              messages,
              nodes: patternNodes,
            },
          ],
        };
      }
    } catch (err) {
      // Fall back to dissect
    }

    // Try dissect pattern extraction
    let dissectResult = null;
    try {
      const grouped = groupMessagesByDissectPattern(messages);
      if (grouped.length > 0) {
        dissectResult = {
          fieldName,
          messages: grouped[0].messages,
        };
      }
    } catch (err) {
      // Continue
    }

    return { grok: grokResult, dissect: dissectResult };
  }

  /**
   * Parse SSE response from pipeline suggestion endpoint.
   * SSE format:
   *   event: suggested_processing_pipeline
   *   data: {"pipeline": {...}}
   * OR
   *   data: {"type": "error", "message": "..."}
   */
  function parseSSEResponse(responseText: string): StreamlangDSL | null {
    try {
      const allLines = responseText.split('\n');
      const dataLines = allLines.filter((line) => line.startsWith('data: '));
      const eventLines = allLines.filter((line) => line.startsWith('event: '));

      if (dataLines.length === 0) {
        // eslint-disable-next-line no-console
        console.error('No SSE data lines found in response');
        return null;
      }

      // Check for error events in data
      for (const line of dataLines) {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'error') {
          // eslint-disable-next-line no-console
          console.error('Pipeline suggestion error:', data.message || data.error);
          return null;
        }
      }

      // Find the suggested_processing_pipeline event
      const eventIndex = eventLines.findIndex((line) =>
        line.includes('suggested_processing_pipeline')
      );

      if (eventIndex === -1) {
        // eslint-disable-next-line no-console
        console.error('No suggested_processing_pipeline event found');
        return null;
      }

      // Get corresponding data line (should be after the event line in the original text)
      // Find the data line that comes after this event line
      const lastDataLine = dataLines[dataLines.length - 1];
      const parsed = JSON.parse(lastDataLine.slice(6));

      // Response format: {"pipeline": {...}}
      return parsed.pipeline || null;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to parse SSE response:', err);
      return null;
    }
  }

  /**
   * Run pipeline suggestion for a single example.
   */
  async function runPipelineSuggestion(
    example: PipelineSuggestionEvaluationExample,
    kbnClient: KbnClient,
    esClient: any,
    connector: { id: string }
  ): Promise<{
    input: typeof example.input;
    output: {
      suggestedPipeline: StreamlangDSL | null;
      simulationResult: ProcessingSimulationResponse;
      metrics: PipelineSuggestionMetrics;
    };
    expected: typeof example.output;
    metadata: typeof example.metadata;
  }> {
    const { input, output: expected, metadata } = example;

    try {
      // Get documents - either from inline or by fetching
      let documents: FlattenRecord[];
      if (input.sample_documents && input.sample_documents.length > 0) {
        // Inline mode: use provided documents and clean up stream metadata
        documents = input.sample_documents.map((doc) => {
          const flattened = flattenObject(doc);
          // Replace stream.name with the target stream name to avoid constant_keyword conflicts
          if (flattened['stream.name']) {
            flattened['stream.name'] = input.stream_name;
          }
          return flattened;
        });
      } else if (input.sample_document_count) {
        // Index mode: fetch from existing stream
        documents = await fetchSampleDocuments(
          esClient,
          input.stream_name,
          input.sample_document_count
        );

        if (!documents || documents.length === 0) {
          // Check if parent stream has documents
          const parentDocs = await fetchSampleDocuments(esClient, 'logs', 10);
          const parentCount = parentDocs.length;

          // Get some sample filepaths from parent to help debug routing
          const sampleFilepaths = parentDocs
            .slice(0, 5)
            .map((doc) => doc['attributes.filepath'])
            .filter(Boolean);

          throw new Error(
            `No documents found in stream ${input.stream_name}. ` +
              `Parent stream 'logs' has ${parentCount} documents. ` +
              `Sample filepaths: ${sampleFilepaths.join(', ')}. ` +
              `Expected filepath: ${input.system}.log`
          );
        }
      } else {
        throw new Error(`Example must provide either sample_documents or sample_document_count`);
      }

      // Extract patterns
      const extractedPatterns = extractPatterns(documents);

      // Call suggest_processing_pipeline route
      const pipelineResponse = await kbnClient.request({
        method: 'POST',
        path: `/internal/streams/${input.stream_name}/_suggest_processing_pipeline`,
        body: {
          connector_id: connector.id,
          documents,
          extracted_patterns: extractedPatterns,
        },
      });

      // Parse SSE response
      const suggestedPipeline = parseSSEResponse(pipelineResponse.data as string);

      // Check if no pipeline is expected
      const expectsNoPipeline =
        expected.expected_processors.parsing === undefined &&
        (expected.expected_processors.normalization?.length ?? 0) === 0;

      // Check if LLM returned no pipeline (null or empty steps array)
      const isEmptyPipeline = !suggestedPipeline || (suggestedPipeline.steps?.length ?? 0) === 0;

      // Handle case where LLM returns no pipeline (null or empty)
      if (isEmptyPipeline) {
        if (expectsNoPipeline) {
          // LLM correctly identified that no pipeline is needed - perfect score
          const perfectMetrics: PipelineSuggestionMetrics = {
            parseRate: 1,
            fieldCount: 0,
            processorCount: 0,
            processorTypes: {},
            processorFailureRates: {},
            otelCompliance: 1,
            semanticFieldCoverage: 1,
            typeCorrectness: 1,
            stepCount: 0,
            stepEfficiency: 1,
            hasRedundantProcessors: false,
            overallQuality: 1,
          };

          const emptySimulationResult: ProcessingSimulationResponse = {
            documents: [],
            processors_metrics: {},
            documents_metrics: {
              failed_rate: 0,
              partially_parsed_rate: 0,
              skipped_rate: 0,
              parsed_rate: 1,
              dropped_rate: 0,
            },
            detected_fields: [],
            definition_error: undefined,
          };

          return {
            input,
            output: {
              suggestedPipeline: null,
              simulationResult: emptySimulationResult,
              metrics: perfectMetrics,
            },
            expected,
            metadata,
          };
        }

        // LLM returned no/empty pipeline but we expected one - this is an error
        const responsePreview = (pipelineResponse.data as string).slice(0, 1000);
        const sampleDoc = documents[0];
        const bodyPreview = (sampleDoc['body.text'] as string | undefined)?.slice(0, 200);

        throw new Error(
          `Pipeline suggestion returned null/empty for ${input.stream_name}. ` +
            `Response preview: ${responsePreview}. ` +
            `Sample document body.text: ${bodyPreview}. ` +
            `Document count: ${documents.length}`
        );
      }

      // If we get here, LLM suggested a non-empty pipeline but we expected none
      if (expectsNoPipeline) {
        const poorMetrics: PipelineSuggestionMetrics = {
          parseRate: 0,
          fieldCount: 0,
          processorCount: suggestedPipeline.steps?.length ?? 0,
          processorTypes: {},
          processorFailureRates: {},
          otelCompliance: 0,
          semanticFieldCoverage: 0,
          typeCorrectness: 0,
          stepCount: suggestedPipeline.steps?.length ?? 0,
          stepEfficiency: 0,
          hasRedundantProcessors: true,
          overallQuality: 0,
        };

        const emptySimulationResult: ProcessingSimulationResponse = {
          documents: [],
          processors_metrics: {},
          documents_metrics: {
            failed_rate: 1,
            partially_parsed_rate: 0,
            skipped_rate: 0,
            parsed_rate: 0,
            dropped_rate: 0,
          },
          detected_fields: [],
          definition_error: undefined,
        };

        return {
          input,
          output: {
            suggestedPipeline,
            simulationResult: emptySimulationResult,
            metrics: poorMetrics,
          },
          expected,
          metadata,
        };
      }

      // Simulate the suggested pipeline
      const simulationResponse = await kbnClient.request({
        method: 'POST',
        path: `/internal/streams/${input.stream_name}/processing/_simulate`,
        body: {
          documents,
          processing: suggestedPipeline,
        },
      });

      const simulationResult = simulationResponse.data as ProcessingSimulationResponse;

      // Calculate metrics
      const metrics = calculatePipelineSuggestionMetrics(
        suggestedPipeline,
        simulationResult,
        expected
      );

      return {
        input,
        output: { suggestedPipeline, simulationResult, metrics },
        expected,
        metadata,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error in runPipelineSuggestion:', error);
      throw error;
    }
  }

  // =============================================================================
  // EVALUATORS
  // =============================================================================

  const formatPercent = (n: number): string => `${(n * 100).toFixed(0)}%`;

  /**
   * Code-based evaluator that calculates pipeline quality metrics.
   */
  const codeBasedEvaluator = {
    name: 'pipeline_quality_score',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: any }) => {
      // Handle both direct and nested output structures
      const actualOutput = output?.output || output;
      const metrics: PipelineSuggestionMetrics = actualOutput?.metrics;

      if (!metrics) {
        // eslint-disable-next-line no-console
        console.error('No metrics found in output:', JSON.stringify(output, null, 2));
        return { score: 0, reasoning: 'No metrics available' };
      }

      const issues: string[] = [];
      if (metrics.parseRate < 0.8)
        issues.push(`Low parse rate: ${formatPercent(metrics.parseRate)}`);
      if (metrics.otelCompliance < 0.7)
        issues.push(`Low OTel compliance: ${formatPercent(metrics.otelCompliance)}`);
      if (metrics.semanticFieldCoverage < 0.6)
        issues.push(`Missing semantic fields: ${formatPercent(metrics.semanticFieldCoverage)}`);
      if (metrics.stepEfficiency < 1.0)
        issues.push(
          `Too many steps (${metrics.stepCount}): efficiency ${formatPercent(
            metrics.stepEfficiency
          )}`
        );
      if (metrics.hasRedundantProcessors) issues.push(`Has redundant processors`);

      return {
        score: metrics.overallQuality,
        details: {
          parseRate: metrics.parseRate,
          otelCompliance: metrics.otelCompliance,
          semanticFieldCoverage: metrics.semanticFieldCoverage,
          typeCorrectness: metrics.typeCorrectness,
          stepCount: metrics.stepCount,
          stepEfficiency: metrics.stepEfficiency,
          processorFailureRates: metrics.processorFailureRates,
        },
        reasoning:
          issues.length > 0
            ? `Issues: ${issues.join('; ')}`
            : `Good quality: ${formatPercent(metrics.overallQuality)}`,
      };
    },
  };

  /**
   * LLM-based evaluator with clear criteria.
   */
  function createLlmEvaluator(evaluators: any) {
    return {
      name: 'llm_pipeline_quality',
      kind: 'LLM' as const,
      evaluate: async ({ input, output, expected }: any) => {
        // Handle both direct and nested output structures
        const actualOutput = output?.output || output;
        const pipeline = actualOutput?.suggestedPipeline;
        const metrics = actualOutput?.metrics;

        // Check if no pipeline is expected (structured data that needs no processing)
        const expectsNoPipeline =
          expected?.expected_processors?.parsing === undefined &&
          (expected?.expected_processors?.normalization?.length ?? 0) === 0;

        const isEmptyPipeline = !pipeline || (pipeline.steps?.length ?? 0) === 0;

        // If no pipeline was expected and LLM returned empty/no pipeline, that's perfect
        if (expectsNoPipeline && isEmptyPipeline) {
          return { score: 1.0 };
        }

        // If no pipeline was expected but LLM returned one, that's poor
        if (expectsNoPipeline && !isEmptyPipeline) {
          return { score: 0.0 };
        }

        if (!metrics) {
          // eslint-disable-next-line no-console
          console.error('No metrics found for LLM evaluator:', JSON.stringify(output, null, 2));
        }

        const criteria = [
          `PARSING QUALITY: The pipeline should successfully parse log messages (≥80% parse rate).
           - Parse rate should be high (from simulation metrics)
           - Key semantic fields should be extracted (timestamp, log level, source info)
           - Field names should follow OTel standards (attributes.*, resource.attributes.*, etc.)`,

          `SCHEMA COMPLIANCE: Extracted field names must match expected OTel schema fields.
           - Check against expected_schema_fields list (OTel conventions only)
           - Fields should use OTel naming: attributes.*, severity_text, body.text, resource.attributes.*
           - At least 70% of expected fields should be present in final output
           - Only count fields that exist in final output (not intermediate fields)`,

          `NORMALIZATION QUALITY: Post-parsing processors should normalize data correctly.
           - DATE processors: Convert custom timestamps to @timestamp (ISO8601)
           - CONVERT processors: String fields converted to proper types (numbers, booleans, IPs)
           - REMOVE processors: Clean up temporary fields after conversion
           - RENAME processors: Map to schema-compliant names`,

          `EFFICIENCY: The pipeline should be optimized with minimal steps.
           - Optimal: 3-6 steps (parsing + essential normalization)
           - Acceptable: 7-8 steps (70% efficiency)
           - Poor: 9-10 steps (40% efficiency)
           - Very poor: >10 steps (10% efficiency - heavy penalty)
           - No duplicate processing or redundant processors
           - Each processor should have <20% failure rate`,

          `ERROR HANDLING: The pipeline should handle edge cases gracefully.
           - Processor failure rates should be reasonable (<20% per processor)
           - Pipeline should not fail completely on individual errors
           - Simulation should show acceptable error handling`,
        ];

        const steps = pipeline?.steps || [];
        const processorTypes = steps.map((s: any) => s.action).join(', ');

        return evaluators.criteria(criteria).evaluate({
          input: {
            system: input?.system,
            sample_document_count: input?.sample_document_count,
          },
          output: {
            pipeline_steps: steps,
            processor_types: processorTypes,
            step_count: metrics?.stepCount,
            step_efficiency: metrics?.stepEfficiency,
            parse_rate: metrics?.parseRate,
            processor_failure_rates: metrics?.processorFailureRates,
            semantic_field_coverage: metrics?.semanticFieldCoverage,
            otel_compliance: metrics?.otelCompliance,
          },
          expected: {
            min_parse_rate: expected?.quality_thresholds?.min_parse_rate,
            required_fields: expected?.quality_thresholds?.required_semantic_fields,
            expected_schema_fields: expected?.schema_expectations?.expected_schema_fields,
            expected_processors: expected?.expected_processors,
          },
        });
      },
    };
  }

  // =============================================================================
  // TEST RUNNER
  // =============================================================================

  /**
   * Run tests for each dataset.
   */
  PIPELINE_SUGGESTION_DATASETS.forEach((dataset) => {
    evaluate.describe(dataset.name, { tag: tags.stateful.classic }, () => {
      evaluate.beforeAll(async ({ apiServices }) => {
        await apiServices.streams.enable();
      });

      evaluate.afterAll(async ({ apiServices, esClient }) => {
        await apiServices.streams.disable();
        await esClient.indices.deleteDataStream({
          name: 'logs*',
        });
      });

      dataset.examples.forEach((example, idx) => {
        evaluate(
          `${idx + 1}. ${example.input.system}`,
          async ({
            phoenixClient,
            kbnClient,
            esClient,
            connector,
            evaluators,
            apiServices,
            config,
          }) => {
            const isInlineMode =
              example.input.sample_documents && example.input.sample_documents.length > 0;

            if (isInlineMode) {
              // INLINE MODE: Use parent 'logs' stream directly, pass documents in API call
              // No need to fork or index - documents are passed directly
              example.input.stream_name = 'logs';
            } else {
              // INDEX MODE: Create system-specific stream AND index data
              // Route based on attributes.filepath which is set to "{System}.log" by synthtrace
              await apiServices.streams.forkStream('logs', example.input.stream_name, {
                field: 'attributes.filepath',
                eq: `${example.input.system}.log`,
              });

              // Index logs for this system - this will route to the child stream
              await indexSystemLogs({
                config,
                system: example.input.system,
              });

              // Wait for documents to be indexed and routed
              await new Promise((resolve) => setTimeout(resolve, 3000));
            }
            // Both modes: stream now exists, documents ready (inline in example, indexed for system)

            await phoenixClient.runExperiment(
              {
                dataset: {
                  name: `Pipeline Suggestion - ${example.input.system}`,
                  description: dataset.description,
                  examples: [
                    {
                      input: example.input,
                      output: example.output as unknown as Record<string, unknown>,
                      metadata: example.metadata,
                    },
                  ],
                },
                task: () => runPipelineSuggestion(example, kbnClient, esClient, connector),
              },
              [codeBasedEvaluator, createLlmEvaluator(evaluators)]
            );
          }
        );
      });
    });
  });
});
