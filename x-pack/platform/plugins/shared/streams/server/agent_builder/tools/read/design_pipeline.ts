/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import dedent from 'dedent';
import type { Logger } from '@kbn/core/server';
import {
  getStreamTypeFromDefinition,
  type FlattenRecord,
  type StreamType,
} from '@kbn/streams-schema';
import type { GetScopedClients } from '../../../routes/types';
import type { IPatternExtractionService } from '../../../lib/pattern_extraction/pattern_extraction_service';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import { simulateProcessing } from '../../../routes/internal/streams/processing/simulation_handler';
import { STREAMS_DESIGN_PIPELINE_TOOL_ID as DESIGN_PIPELINE } from '../tool_ids';
import { classifyError } from '../../utils/error_utils';
import { abortSignalFromRequest } from '../../utils/write_queue';
import { nlToStreamlang } from './nl_to_streamlang';
import { runExtractFieldsFlow } from './extract_fields_handler';

const samplesSchema = z
  .union([
    z.object({
      source: z.literal('stream'),
      size: z.number().int().min(1).max(500).optional(),
    }),
    z.object({
      source: z.literal('inline'),
      documents: z.array(z.record(z.string(), z.unknown())),
      status: z.enum(['processed', 'unprocessed']),
    }),
  ])
  .optional()
  .describe(
    'How to obtain sample documents for simulation. ' +
      'Omit to auto-fetch 100 recent documents from the stream (recommended). ' +
      'Use { source: "stream", size: N } to control the sample size. ' +
      'Use { source: "inline", documents: [...], status: "processed"|"unprocessed" } to provide your own.'
  );

const designPipelineSchema = z.object({
  stream_name: z.string().describe('Exact stream name, e.g. "logs.otel.linux"'),
  instruction: z
    .string()
    .describe(
      'Natural language instruction describing what to change in the processing pipeline. ' +
        'Examples: "parse syslog from body.text using grok", ' +
        '"add a date parser for the timestamp field", ' +
        '"remove the convert step for status", ' +
        '"rename attributes.src_ip to source.ip"'
    ),
  samples: samplesSchema,
  extract_fields: z
    .boolean()
    .optional()
    .describe(
      [
        'Set to true ONLY when the user asks the system to discover structure on its own — they',
        'do NOT name any specific fields they want extracted. Examples that qualify:',
        '"parse this stream", "structure body.text", "make sense of these logs",',
        '"extract whatever fields you can find".',
        'This runs autonomous grok/dissect pattern discovery on the raw text and ignores the',
        'instruction text for the extraction itself; the LLM only designs follow-up steps',
        '(date parsing, conversions, renames) on top.',
        'Set to false (or omit) for ANY instruction that names specific fields, e.g.',
        '"extract IP and status from body.text", "grab user_id and request_id",',
        '"parse the timestamp into @timestamp", or for any non-extraction edit (rename,',
        'convert, redact, remove a step, fix an existing pattern).',
        'Falls back to the regular path when no good seed pattern can be discovered.',
      ].join(' ')
    ),
  seed_source_field: z
    .string()
    .optional()
    .describe(
      'When extract_fields: true, override the auto-picked raw-text field that the seed parser ' +
        'reads. The default auto-pick walks PRIORITIZED_CONTENT_FIELDS (message, body.text, …) ' +
        'and ignores the instruction text — pass this when the user names a different field to ' +
        'parse from (e.g. "parse the error.message column instead"), or after reviewing a ' +
        'proposal whose duplication/overwrite warning indicates a different source would be ' +
        'cleaner. Has no effect when extract_fields is false or omitted.'
    ),
});

export const createDesignPipelineTool = ({
  getScopedClients,
  patternExtractionService,
  logger,
  telemetry,
}: {
  getScopedClients: GetScopedClients;
  patternExtractionService: IPatternExtractionService;
  logger: Logger;
  telemetry: EbtTelemetryClient;
}): BuiltinToolDefinition<typeof designPipelineSchema> => ({
  id: DESIGN_PIPELINE,
  type: ToolType.builtin,
  description: dedent(`
    Designs changes to a stream's processing pipeline based on a natural language description. Does NOT apply changes — pass the result to the update stream tool to commit.

    The tool fetches the stream's current pipeline, naming convention (ECS/OTel), and schema internally. It applies your described change to the existing pipeline, simulates it against sample documents, and returns the full proposed pipeline for review.

    **When to use:**
    - Adding new processing steps: "parse Apache logs from body.text using grok"
    - Modifying existing steps: "change the grok pattern to also capture the port"
    - Removing steps: "remove the convert step for status"
    - Building a pipeline from scratch: "parse syslog, extract timestamps, convert types, and clean up temp fields"

    **Field extraction from raw text (extract_fields: true):**
    - Use ONLY when the user asks the system to discover structure on its own — they do NOT name any specific fields they want extracted. Qualifying phrasings: "parse this stream", "structure body.text", "make sense of these logs", "auto-extract whatever fields you can find".
    - This runs autonomous grok/dissect pattern discovery on the raw text. The user's instruction is NOT used to drive what gets captured — the heuristic decides. The LLM only designs follow-up steps (date parsing, conversions, renames) on top of whatever the heuristic produced.
    - Set to false (or omit) the moment the user names ANY specific output field. Examples that should use extract_fields: false: "extract IP and status from body.text", "grab user_id and request_id from message", "add a grok step that captures method, path, response_time", "parse the timestamp into @timestamp". The LLM path takes the instruction as input and produces a pattern matching the named fields.
    - Also use extract_fields: false (omit) for any non-extraction edit: rename, convert, redact, remove a step, fix an existing pattern, date parse on already-extracted fields.

    **When NOT to use:**
    - Inspecting the current pipeline: use the inspect streams tool with aspects: ["processing"]
    - Applying the pipeline: pass the returned steps to the update stream tool

    **Important:**
    - Sample documents are fetched automatically from the stream. You do not need to fetch or pass documents.
    - The returned steps array is the COMPLETE proposed pipeline — pass it directly to the update stream tool to replace the stream's processing.
    - Simulation may be partial when existing steps are modified (documents already reflect prior processing).
    - extract_fields: true is slower (~30s heuristics + reasoning agent). Only use it when raw-text parsing is genuinely needed.

    **Result:** Returns the complete proposed pipeline, a summary, field changes with sample values, simulation results (success rate, errors, simulation mode), samples info, and any warnings or hints.
  `),
  tags: ['streams'],
  schema: designPipelineSchema,
  handler: async (
    {
      stream_name: streamName,
      instruction: changeDescription,
      samples,
      extract_fields: extractFields,
      seed_source_field: seedSourceField,
    },
    { request, modelProvider }
  ) => {
    // Telemetry is emitted exactly once at the end of the handler so that
    // every `design_pipeline` invocation produces a single event regardless
    // of which engine ran (or whether either ran at all). The fields below
    // are mutated in-place by the branches and read in `finally`.
    const startTime = Date.now();
    let success = false;
    let stepsUsed = 0;
    let flow: 'extract_fields' | 'nl_to_streamlang' = 'nl_to_streamlang';
    let extractFieldsFallbackReason: string | undefined;
    // `'unknown'` is the safe default for the case where we throw before
    // resolving the stream definition (e.g. `getScopedClients` fails).
    let streamType: StreamType = 'unknown';
    // source-field conflict observability
    let sourceFieldConflictDetected: boolean | undefined;
    let sourceFieldExplicitlySet: boolean | undefined;
    let sourceFieldPicked: string | undefined;

    try {
      const { streamsClient, scopedClusterClient, fieldsMetadataClient, inferenceClient } =
        await getScopedClients({ request });
      const esClient = scopedClusterClient.asCurrentUser;
      const model = await modelProvider.getDefaultModel();

      const typedSamples = samples as Parameters<typeof nlToStreamlang>[0]['samples'];

      // Extra prose surfaced to the LLM alongside the structured
      // `extract_fields_outcome` field on the response. We deliberately do
      // NOT duplicate the outcome / reason in here — the skill prompt
      // branches on the structured fields. `fallbackHints` is reserved for
      // genuinely additional context (e.g. `outcome.extraHints` explaining
      // why the field was unusable).
      const fallbackHints: string[] = [];

      if (extractFields) {
        sourceFieldExplicitlySet = seedSourceField !== undefined;
        const outcome = await runExtractFieldsFlow(
          {
            streamName,
            samples: typedSamples,
            seedSourceField,
          },
          {
            streamsClient,
            scopedClusterClient,
            inferenceClient,
            boundInferenceClient: model.inferenceClient,
            connectorId: model.connector.connectorId,
            fieldsMetadataClient,
            patternExtractionService,
            logger,
            signal: abortSignalFromRequest(request),
          }
        );

        streamType = outcome.streamType;
        sourceFieldPicked = outcome.pickedSourceField;
        sourceFieldConflictDetected = outcome.sourceFieldConflictDetected;

        if (outcome.kind === 'unsupported') {
          // The non-ingest case carries no proposal — return only the
          // warning + structured outcome pair. No `status` /
          // `proposal_not_applied` / empty `steps` / empty `simulation`
          // are emitted because there is nothing for the user to apply.
          flow = 'extract_fields';
          success = true;
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  stream: streamName,
                  warnings: [outcome.warning],
                  extract_fields_outcome: 'unsupported' as const,
                  extract_fields_reason: 'unsupported_stream_type',
                },
              },
            ],
          };
        }

        if (outcome.kind === 'success') {
          flow = 'extract_fields';
          success = true;
          stepsUsed = outcome.stepsUsed;
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  stream: streamName,
                  ...outcome.result,
                  extract_fields_outcome: 'success' as const,
                  status: 'proposal_not_applied',
                  note: 'This is a proposed pipeline change. Present the simulation results to the user for review before applying.',
                },
              },
            ],
          };
        }

        // outcome.kind === 'fallback' — heuristics produced no usable seed.
        // Fall through to nlToStreamlang so the LLM still gets a chance.
        extractFieldsFallbackReason = outcome.reason;
        if (outcome.extraHints && outcome.extraHints.length > 0) {
          fallbackHints.push(...outcome.extraHints);
        }
      }

      const result = await nlToStreamlang(
        {
          streamName,
          instruction: changeDescription,
          samples: typedSamples,
        },
        {
          streamsClient,
          esClient,
          inferenceClient: model.inferenceClient,
          simulatePipeline: async (name, processing, simDocs) =>
            simulateProcessing({
              params: {
                path: { name },
                body: { processing, documents: simDocs as FlattenRecord[] },
              },
              esClient,
              streamsClient,
              fieldsMetadataClient,
            }),
        }
      );

      // The LLM path doesn't surface a stream type — fetch the definition
      // separately ONLY when we haven't already resolved one via the
      // heuristic outcome. Cheap (cached upstream) and means telemetry
      // always reports the right type for analytics filtering.
      if (streamType === 'unknown') {
        const definition = await streamsClient.getStream(streamName);
        streamType = getStreamTypeFromDefinition(definition);
      }

      flow = 'nl_to_streamlang';
      success = true;
      const mergedHints = [...fallbackHints, ...(result.hints ?? [])];

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              stream: streamName,
              ...result,
              ...(mergedHints.length > 0 && { hints: mergedHints }),
              // Only surfaced when the caller asked for extract_fields. The
              // structured pair lets the skill prompt and evals branch
              // deterministically without sniffing English from `hints`.
              ...(extractFields && {
                extract_fields_outcome: 'fallback' as const,
                ...(extractFieldsFallbackReason && {
                  extract_fields_reason: extractFieldsFallbackReason,
                }),
              }),
              status: 'proposal_not_applied',
              note: 'This is a proposed pipeline change. Present the simulation results to the user for review before applying.',
            },
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to design pipeline for stream "${streamName}": ${message}`,
              stream: streamName,
              operation: 'design_pipeline',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    } finally {
      telemetry.trackProcessingPipelineSuggested({
        duration_ms: Date.now() - startTime,
        steps_used: stepsUsed,
        success,
        stream_name: streamName,
        stream_type: streamType,
        source: 'agent',
        flow,
        ...(extractFieldsFallbackReason !== undefined && {
          extract_fields_fallback_reason: extractFieldsFallbackReason,
        }),
        ...(sourceFieldConflictDetected !== undefined && {
          source_field_conflict_detected: sourceFieldConflictDetected,
        }),
        ...(sourceFieldExplicitlySet !== undefined && {
          source_field_explicitly_set: sourceFieldExplicitlySet,
        }),
        ...(sourceFieldPicked !== undefined && { source_field_picked: sourceFieldPicked }),
      });
    }
  },
});
