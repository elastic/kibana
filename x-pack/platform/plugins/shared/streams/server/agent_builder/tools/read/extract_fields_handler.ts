/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { BoundInferenceClient, InferenceClient } from '@kbn/inference-common';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import {
  Streams,
  type FlattenRecord,
  getStreamTypeFromDefinition,
  isOtelStream,
} from '@kbn/streams-schema';
import {
  buildDocumentStructureOverviewForPipelinePrompt,
  fetchMappedFieldsForStreamProcessingSuggestions,
  formatUpstreamSeedParsingContextForPromptMarkdown,
  mergeSeedParsingProcessorIntoSuggestedPipeline,
  postParsePipelineDefinitionSchema,
  suggestProcessingPipeline,
} from '@kbn/streams-ai';
import {
  PRIORITIZED_CONTENT_FIELDS,
  extractMessagesFromField,
  getDefaultTextField,
} from '../../../../common/pattern_extraction_helpers';
import type { StreamsClient } from '../../../lib/streams/client';
import type { IPatternExtractionService } from '../../../lib/pattern_extraction/pattern_extraction_service';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import { simulateProcessing } from '../../../routes/internal/streams/processing/simulation_handler';
import { isNoLLMSuggestionsError } from '../../../routes/internal/streams/processing/no_llm_suggestions_error';
import {
  extractParsedSampleDocuments,
  formatInferenceErrorMeta,
  getErrorMessage,
  processDissectPattern,
  processGrokPatterns,
  type SeedParsingCandidate,
} from '../../../routes/internal/streams/management/seed_parsing_helpers';
import {
  buildSummary,
  computeFieldChanges,
  computeSuccessRate,
  extractFieldsFromDocuments,
  extractSimulationErrors,
  injectIgnoreFailure,
  resolveSamples,
  type NlToStreamlangResult,
  type SamplesConfig,
} from './nl_to_streamlang';
import { buildDropWarnings, computePipelineDiff } from './pipeline_diff';

/**
 * `extract_fields: true` mode for the `design_pipeline` tool. Mirrors the
 * server-side flow that powers the streams management UI's "Suggest
 * Processing Pipeline" action: heuristic grok/dissect discovery in worker
 * threads, narrow LLM review, post-parse design via the streams-ai
 * reasoning agent, and programmatic merge of the seed pattern.
 *
 * The grok/dissect pattern is system-managed: no LLM ever receives it as
 * editable text.
 */
const SUB_AGENT_MAX_STEPS = 6;
const SUB_AGENT_MAX_DURATION_MS = 180_000;
const OPERATION_TIMEOUT_MS = 3 * 60 * 1000;

export interface RunExtractFieldsParams {
  streamName: string;
  samples?: SamplesConfig;
}

export interface RunExtractFieldsDeps {
  streamsClient: StreamsClient;
  scopedClusterClient: IScopedClusterClient;
  /**
   * Un-bound inference client used by the seed-parsing helpers. They re-bind
   * internally per call, so the caller passes the connector id alongside.
   */
  inferenceClient: InferenceClient;
  /**
   * Pre-bound inference client passed straight to the streams-ai reasoning
   * agent.
   */
  boundInferenceClient: BoundInferenceClient;
  connectorId: string;
  fieldsMetadataClient: IFieldsMetadataClient;
  patternExtractionService: IPatternExtractionService;
  telemetry: EbtTelemetryClient;
  logger: Logger;
  /** Caller-provided abort signal (e.g. the agent request). */
  signal?: AbortSignal;
}

export type RunExtractFieldsOutcome =
  | { kind: 'fallback'; reason: string }
  | { kind: 'unsupported'; result: NlToStreamlangResult }
  | { kind: 'success'; result: NlToStreamlangResult };

/**
 * Run the `extract_fields: true` flow.
 *
 * Outcomes:
 * - `fallback` — extraction yielded no usable seed pattern. The tool's outer
 *   handler should fall back to {@link nlToStreamlang} so the LLM can still
 *   attempt grok/dissect from first principles.
 * - `unsupported` — the stream is not an ingest stream, so suggestions cannot
 *   run. Returns a tool-shaped result with empty steps and a warning so the
 *   agent can surface the reason without falling back.
 * - `success` — heuristic + reasoning agent produced a pipeline. The seed
 *   processor has been merged in; the result mirrors the
 *   {@link NlToStreamlangResult} shape so the tool returns a consistent
 *   payload regardless of which mode produced it.
 */
export const runExtractFieldsFlow = async (
  params: RunExtractFieldsParams,
  deps: RunExtractFieldsDeps
): Promise<RunExtractFieldsOutcome> => {
  const { streamName } = params;
  const {
    streamsClient,
    scopedClusterClient,
    inferenceClient,
    boundInferenceClient,
    connectorId,
    fieldsMetadataClient,
    patternExtractionService,
    telemetry,
    logger,
    signal,
  } = deps;

  const log = logger.get('extract_fields');

  const definition = await streamsClient.getStream(streamName);
  if (!Streams.ingest.all.Definition.is(definition)) {
    return {
      kind: 'unsupported',
      result: {
        steps: [],
        existing_steps: [],
        step_changes: [],
        summary: '',
        field_changes: [],
        simulation: { success_rate: null, sample_count: 0, mode: 'complete' },
        warnings: [
          'extract_fields is only supported for ingest streams (wired or classic). The selected stream is not an ingest stream.',
        ],
        samples_info: { source: 'stream', count: 0 },
      },
    };
  }

  const existingSteps = definition.ingest.processing.steps;

  const { documents, samplesInfo } = await resolveSamples(
    params.samples,
    streamName,
    scopedClusterClient.asCurrentUser
  );

  if (documents.length === 0) {
    log.debug(`No sample documents available (stream=${streamName}); falling back`);
    return { kind: 'fallback', reason: 'no_samples' };
  }

  const flattenedDocs = documents as FlattenRecord[];

  const fieldName = getDefaultTextField(flattenedDocs, PRIORITIZED_CONTENT_FIELDS);
  const messages = fieldName ? extractMessagesFromField(flattenedDocs, fieldName) : [];

  if (messages.length === 0) {
    log.debug(
      `No raw text messages found in samples (stream=${streamName} fieldName="${fieldName}"); falling back`
    );
    return { kind: 'fallback', reason: 'no_text_field' };
  }

  // Combine the caller-provided signal with a 3-minute operation timeout so
  // long heuristic runs cannot hang the agent.
  const timeoutSignal = AbortSignal.timeout(OPERATION_TIMEOUT_MS);
  const compositeAbort = new AbortController();
  const cleanup = () => compositeAbort.abort();
  signal?.addEventListener('abort', cleanup);
  timeoutSignal.addEventListener('abort', cleanup);

  const startTime = Date.now();
  let success = false;
  let stepsUsed = 0;

  try {
    log.debug(
      `Scheduling parallel grok + dissect extraction (stream=${streamName} messages=${messages.length} fieldName=${fieldName})`
    );

    const settled = await Promise.allSettled<SeedParsingCandidate | null>([
      processGrokPatterns({
        messages,
        fieldName,
        streamName,
        connectorId,
        documents: flattenedDocs,
        patternExtractionService,
        inferenceClient,
        scopedClusterClient,
        streamsClient,
        fieldsMetadataClient,
        signal: compositeAbort.signal,
        logger: log,
      }),
      processDissectPattern({
        messages,
        fieldName,
        streamName,
        connectorId,
        documents: flattenedDocs,
        patternExtractionService,
        inferenceClient,
        scopedClusterClient,
        streamsClient,
        fieldsMetadataClient,
        signal: compositeAbort.signal,
        logger: log,
      }),
    ]);

    const candidates: SeedParsingCandidate[] = [];
    for (const settledResult of settled) {
      if (settledResult.status === 'fulfilled' && settledResult.value !== null) {
        candidates.push(settledResult.value);
      } else if (settledResult.status === 'rejected') {
        const { reason } = settledResult;
        if (isNoLLMSuggestionsError(reason)) {
          log.debug(`No LLM suggestions available (stream=${streamName})`);
        } else {
          log.error(
            `Candidate failed (stream=${streamName}${formatInferenceErrorMeta(
              reason
            )}): ${getErrorMessage(reason)}`
          );
        }
      }
    }

    if (candidates.length === 0) {
      log.debug(`No seed candidate produced (stream=${streamName}); falling back`);
      return { kind: 'fallback', reason: 'no_candidate' };
    }

    candidates.sort((a, b) => b.parsedRate - a.parsedRate);
    const winning = candidates[0];
    log.debug(
      `Selected ${winning.type} processor (stream=${streamName} parsedRate=${winning.parsedRate})`
    );

    const { parsedDocuments, definitionError } = await extractParsedSampleDocuments({
      streamName,
      documents: flattenedDocs,
      parsingProcessor: winning.processor,
      scopedClusterClient,
      streamsClient,
      fieldsMetadataClient,
      logger: log,
    });

    if (definitionError || parsedDocuments.length === 0) {
      log.debug(
        `Seed simulation produced no parsed docs (stream=${streamName} definitionError=${definitionError}); falling back`
      );
      return { kind: 'fallback', reason: 'no_parsed_documents' };
    }

    const isOtel = isOtelStream(definition);
    const mappedFields = await fetchMappedFieldsForStreamProcessingSuggestions(
      scopedClusterClient.asCurrentUser,
      streamName
    );

    const initialDatasetAnalysisJson = JSON.stringify(
      await buildDocumentStructureOverviewForPipelinePrompt(
        parsedDocuments,
        fieldsMetadataClient,
        isOtel,
        mappedFields
      )
    );

    const suggestion = await suggestProcessingPipeline({
      definition,
      inferenceClient: boundInferenceClient,
      agentPipelineSchema: postParsePipelineDefinitionSchema,
      maxSteps: SUB_AGENT_MAX_STEPS,
      maxDurationMs: SUB_AGENT_MAX_DURATION_MS,
      signal: compositeAbort.signal,
      documents: parsedDocuments,
      esClient: scopedClusterClient.asCurrentUser,
      fieldsMetadataClient,
      initialDatasetAnalysisJson,
      mappedFields,
      upstreamSeedParsingContextMarkdown: formatUpstreamSeedParsingContextForPromptMarkdown(
        winning.processor
      ),
      simulatePipeline: (pipeline) =>
        simulateProcessing({
          params: {
            path: { name: streamName },
            body: { processing: pipeline, documents: parsedDocuments },
          },
          esClient: scopedClusterClient.asCurrentUser,
          streamsClient,
          fieldsMetadataClient,
        }),
    });

    stepsUsed = suggestion.metadata.stepsUsed;

    const newlyAdded = suggestion.pipeline
      ? mergeSeedParsingProcessorIntoSuggestedPipeline(winning.processor, suggestion.pipeline)
      : { steps: [{ ...winning.processor }] };

    // Existing steps are preserved by appending them after the heuristic
    // extraction. Order matters: the new grok/dissect step extracts fields
    // first, then any existing date/convert/rename steps run on those
    // extracted fields. Keeping existing steps verbatim — never editing or
    // reordering them — guarantees we don't silently break previously
    // working processing.
    const merged = { steps: [...newlyAdded.steps, ...existingSteps] };

    // Run a final simulation against the original raw documents so we can
    // produce the same `field_changes` / `success_rate` / errors shape the
    // `extract_fields: false` path returns.
    const finalSimulation = await simulateProcessing({
      params: {
        path: { name: streamName },
        body: { processing: merged, documents: flattenedDocs },
      },
      esClient: scopedClusterClient.asCurrentUser,
      streamsClient,
      fieldsMetadataClient,
    });

    const baseFields = extractFieldsFromDocuments(flattenedDocs);
    const fieldChanges = finalSimulation.definition_error
      ? []
      : computeFieldChanges(finalSimulation, baseFields);
    const successRate = finalSimulation.definition_error
      ? null
      : computeSuccessRate(finalSimulation);
    const simErrors = finalSimulation.definition_error
      ? [finalSimulation.definition_error.message]
      : extractSimulationErrors(finalSimulation);

    const warnings: string[] = [];
    if (!suggestion.pipeline) {
      warnings.push(
        'Post-parse design produced no additional steps. The proposed pipeline contains only the system-discovered seed parsing step.'
      );
    }
    if (existingSteps.length > 0) {
      warnings.push(
        `${existingSteps.length} existing processing step(s) preserved after the new extraction. Review that the new extraction does not duplicate or conflict with existing steps before applying.`
      );
      const conflictingExistingStep = existingSteps.find((step) =>
        isExtractionStepOnField(step, fieldName)
      );
      if (conflictingExistingStep) {
        const conflictingAction = (conflictingExistingStep as { action?: string }).action ?? 'step';
        warnings.push(
          `An existing step already extracts from field "${fieldName}" (${conflictingAction}). The new extraction may duplicate work — confirm with the user before applying.`
        );
      }
    }
    if (simErrors.length > 0 && successRate !== null) {
      warnings.push(
        `${successRate}% success rate with ${simErrors.length} error type(s): ${simErrors
          .slice(0, 3)
          .join('; ')}`
      );
    }

    const finalSteps = injectIgnoreFailure(merged.steps);

    // Diff against the pre-existing pipeline so the agent can present a clear
    // before/after view. With the append-existing strategy above the diff is
    // typically all-additions plus all-unchanged, but we still build it to
    // surface any structural mismatch (e.g. a sub-agent surprise) loudly.
    const diff = computePipelineDiff(existingSteps, finalSteps);
    const dropWarnings = buildDropWarnings(diff);

    success = true;

    return {
      kind: 'success',
      result: {
        steps: finalSteps,
        existing_steps: existingSteps,
        step_changes: diff.changes,
        summary: buildSummary(finalSteps),
        field_changes: fieldChanges,
        simulation: {
          success_rate: successRate,
          ...(simErrors.length > 0 && { errors: simErrors }),
          sample_count: flattenedDocs.length,
          mode: 'complete',
        },
        ...(warnings.length + dropWarnings.length > 0 && {
          warnings: [...warnings, ...dropWarnings],
        }),
        hints: [
          `Seed parsing was discovered automatically using ${winning.type} heuristics on field "${fieldName}".`,
          ...buildKeyValueHints(parsedDocuments),
        ],
        samples_info: samplesInfo,
      },
    };
  } finally {
    signal?.removeEventListener('abort', cleanup);
    timeoutSignal.removeEventListener('abort', cleanup);

    telemetry.trackProcessingPipelineSuggested({
      duration_ms: Date.now() - startTime,
      steps_used: stepsUsed,
      success,
      stream_name: streamName,
      stream_type: getStreamTypeFromDefinition(definition),
      source: 'agent',
    });
  }
};

/**
 * Detect whether an existing pipeline step already performs grok or dissect
 * extraction from the given source field. Used to warn the agent (and the
 * user) when running heuristic extraction would duplicate or conflict with
 * pre-existing parsing on the same field.
 *
 * Condition blocks are intentionally not recursed into: they often gate
 * extraction by content (e.g. "if log.level == error then grok…"), and
 * surfacing a false positive there would be more confusing than helpful.
 */
const isExtractionStepOnField = (step: unknown, fieldName: string): boolean => {
  if (typeof step !== 'object' || step === null) return false;
  const obj = step as { action?: unknown; from?: unknown };
  return (obj.action === 'grok' || obj.action === 'dissect') && obj.from === fieldName;
};

/**
 * Minimum number of non-null sample values required to consider a key=value
 * pattern genuine. Avoids false positives on fields with very few populated
 * values.
 */
const KV_MIN_SAMPLES = 5;

/**
 * Fields that are known system/identity fields — skip them even if they
 * happen to contain `=`.
 */
const KV_FIELD_BLOCKLIST = new Set(['@timestamp', 'stream.name', 'body.text', 'message']);

/**
 * Scans parsed documents for fields where every non-null value follows a
 * consistent `key=value` pattern (e.g. `user=u-1234`). Returns hint strings
 * that the agent surfaces to the user — the user decides whether stripping
 * the prefix is appropriate. No automatic rewriting happens; this keeps
 * destructive value changes under human control.
 */
const buildKeyValueHints = (parsedDocuments: FlattenRecord[]): string[] => {
  const fieldValues = new Map<string, string[]>();

  for (const doc of parsedDocuments) {
    if (!doc) continue;
    for (const [fieldName, value] of Object.entries(doc)) {
      if (KV_FIELD_BLOCKLIST.has(fieldName)) continue;
      if (typeof value !== 'string') continue;
      if (!fieldValues.has(fieldName)) {
        fieldValues.set(fieldName, []);
      }
      const arr = fieldValues.get(fieldName)!;
      if (arr.length < 200) {
        arr.push(value);
      }
    }
  }

  const hints: string[] = [];

  for (const [fieldName, values] of fieldValues) {
    if (values.length < KV_MIN_SAMPLES) continue;

    const valuesWithEq = values.filter((v) => v.includes('='));
    if (valuesWithEq.length !== values.length) continue;

    const firstEqIdx = valuesWithEq[0].indexOf('=');
    if (firstEqIdx <= 0) continue;

    const prefix = valuesWithEq[0].substring(0, firstEqIdx);

    const allMatch = values.every(
      (v) => v.startsWith(prefix + '=') && v.length > prefix.length + 1
    );

    if (!allMatch) continue;

    hints.push(
      `Field "${fieldName}" has values like "${values[0]}" — all share a "${prefix}=" prefix. ` +
        `If only the part after "=" is meaningful, ask the user whether to refine the extraction. ` +
        `To refine: call design_pipeline with extract_fields: false and a complete description of ALL fields to extract (use field_changes from this result), specifying that this field should be extracted without the prefix.`
    );
  }

  return hints;
};
