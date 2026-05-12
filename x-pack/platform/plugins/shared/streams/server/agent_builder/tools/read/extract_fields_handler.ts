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
  type StreamType,
} from '@kbn/streams-schema';
import {
  buildDocumentStructureOverviewForPipelinePrompt,
  fetchMappedFieldsForStreamProcessingSuggestions,
  formatUpstreamSeedParsingContextForPromptMarkdown,
  mergeSeedParsingProcessorIntoSuggestedPipeline,
  postParsePipelineDefinitionSchema,
  suggestProcessingPipeline,
  type SuggestProcessingPipelineResult,
} from '@kbn/streams-ai';
import { addDeterministicCustomIdentifiers } from '@kbn/streamlang';
import type { StreamlangStep } from '@kbn/streamlang/types/streamlang';
import {
  PRIORITIZED_CONTENT_FIELDS,
  extractMessagesFromField,
  getDefaultTextField,
} from '../../../../common/pattern_extraction_helpers';
import type { StreamsClient } from '../../../lib/streams/client';
import type { IPatternExtractionService } from '../../../lib/pattern_extraction/pattern_extraction_service';
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
  type SimulationMode,
} from './_pipeline_design_utils';
import { buildDropWarnings, computePipelineDiff } from './pipeline_diff';
import {
  buildDuplicationWarning,
  buildOverwriteWarning,
  buildPlacementWarning,
  isExtractionStepOnField,
  stepWritesOrRemovesField,
} from './extract_fields_warnings';

/**
 * `extract_fields: true` mode for the `design_pipeline` tool. Reuses the
 * heuristic grok/dissect discovery + narrow LLM review that powers the
 * streams management UI's "Suggest Processing Pipeline" action, plus
 * post-parse design via the streams-ai reasoning agent and a programmatic
 * merge of the seed pattern into the existing pipeline.
 *
 * The grok/dissect pattern is system-managed: no LLM ever receives it as
 * editable text.
 *
 * Agent-only behaviours that have NO UI counterpart — do not grep the UI
 * code for these:
 * - Source-field-conflict detection + the post-fact placement /
 *   duplication / overwrite warnings (see `extract_fields_warnings.ts`).
 * - Merge placement (append vs prepend) based on whether an existing
 *   step writes to / removes the seed source field.
 * - Caller-supplied `seedSourceField` override for explicit steering
 *   (see `SOURCE_FIELD_CONFLICT_DECISION.md`).
 * - Key=value prefix hints surfaced through `buildKeyValueHints` for the
 *   `refine_extracted_field` chain.
 * - The `unsupported` outcome (non-ingest streams short-circuit instead
 *   of falling back to the LLM-only path).
 */
const SUB_AGENT_MAX_STEPS = 6;
const SUB_AGENT_MAX_DURATION_MS = 3 * 60 * 1000;

export interface RunExtractFieldsParams {
  streamName: string;
  samples?: SamplesConfig;
  /**
   * Override the auto-picked seed source field. When provided, the seed
   * parser reads this field instead of running `getDefaultTextField`
   * against `PRIORITIZED_CONTENT_FIELDS`. Closes the capability gap
   * where the user could not steer `extract_fields: true` to a
   * non-default field without falling back to the LLM-only path. The
   * existing post-fact warnings (duplication, overwrite, placement)
   * remain the surface for resolving conflicts after a heuristic run
   * completes.
   */
  seedSourceField?: string;
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
  logger: Logger;
  /** Caller-provided abort signal (e.g. the agent request). */
  signal?: AbortSignal;
}

/**
 * Stream-level metadata the outer handler needs for telemetry, regardless of
 * which outcome variant fires. `streamType` is `'unknown'` only when the
 * stream definition itself could not be classified.
 *
 * `pickedSourceField` and `sourceFieldConflictDetected` are for source-field
 * conflict telemetry
 */
export interface ExtractFieldsOutcomeMeta {
  streamType: StreamType;
  pickedSourceField?: string;
  sourceFieldConflictDetected?: boolean;
}

export type RunExtractFieldsOutcome =
  | ({
      kind: 'fallback';
      reason: string;
      /**
       * Contextual hints the outer handler should surface to the agent
       * alongside the generic "extraction did not yield a seed pattern"
       * message. Currently populated the extraction failed because the
       * field was removed by an existing step.
       */
      extraHints?: string[];
    } & ExtractFieldsOutcomeMeta)
  | ({ kind: 'unsupported'; result: NlToStreamlangResult } & ExtractFieldsOutcomeMeta)
  | ({
      kind: 'success';
      result: NlToStreamlangResult;
      stepsUsed: number;
    } & ExtractFieldsOutcomeMeta);

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
 *
 * Conflicts between the (auto-picked or caller-supplied) seed source field
 * and existing pipeline steps are surfaced via the post-fact warnings
 * pipeline (duplication, overwrite, placement) on the success outcome.
 * See `SOURCE_FIELD_CONFLICT_DECISION.md` for the upfront-gate alternative
 * tracked against telemetry.
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
    logger,
    signal,
  } = deps;

  const log = logger.get('extract_fields');

  const definition = await streamsClient.getStream(streamName);
  const streamType = getStreamTypeFromDefinition(definition);
  if (!Streams.ingest.all.Definition.is(definition)) {
    return {
      kind: 'unsupported',
      streamType,
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
  // Resolve the OTel-naming flag once and forward it to both seed-parser
  // branches (and later to the `suggestProcessingPipeline` call). Without
  // this, `processGrokPatterns` and `processDissectPattern` each re-fetch
  // the stream definition inside their LLM-review step purely to compute
  // this boolean — three `streamsClient.getStream` round-trips total per
  // `design_pipeline { extract_fields: true }` call. Hoisting saves the
  // two redundant ones (~half a second of latency).
  const isOtel = isOtelStream(definition);

  const { documents, documentStatus, samplesInfo } = await resolveSamples(
    params.samples,
    streamName,
    scopedClusterClient.asCurrentUser
  );

  if (documents.length === 0) {
    log.debug(`No sample documents available (stream=${streamName}); falling back`);
    return { kind: 'fallback', reason: 'no_samples', streamType };
  }

  const inlineProcessedNoTextFieldHint: string[] | undefined =
    samplesInfo.source === 'inline' && documentStatus === 'processed'
      ? [
          `The inline samples were marked status: "processed". The existing pipeline may have removed the canonical raw-text field (body.text / message). ` +
            `If extraction should run against the original ingest data, re-run with status: "unprocessed" inline documents (or with samples.source: "stream" to use live data).`,
        ]
      : undefined;

  const flattenedDocs = documents as FlattenRecord[];

  const pickedSourceField = params.seedSourceField
    ? params.seedSourceField
    : getDefaultTextField(flattenedDocs, PRIORITIZED_CONTENT_FIELDS);
  const messages = pickedSourceField
    ? extractMessagesFromField(flattenedDocs, pickedSourceField)
    : [];

  if (messages.length === 0) {
    log.debug(
      `No raw text messages found in samples (stream=${streamName} fieldName="${pickedSourceField}"); falling back`
    );
    return {
      kind: 'fallback',
      reason: 'no_text_field',
      streamType,
      ...(pickedSourceField && {
        pickedSourceField,
        sourceFieldConflictDetected: detectSourceFieldConflict(existingSteps, pickedSourceField),
      }),
      ...(inlineProcessedNoTextFieldHint && { extraHints: inlineProcessedNoTextFieldHint }),
    };
  }

  const fieldName = pickedSourceField;
  const sourceFieldConflictDetected = detectSourceFieldConflict(existingSteps, fieldName);

  // Combine the caller-provided signal with a 3-minute operation timeout so
  // long heuristic runs cannot hang the agent.
  const timeoutSignal = AbortSignal.timeout(SUB_AGENT_MAX_DURATION_MS);
  const compositeAbort = new AbortController();
  const cleanup = () => compositeAbort.abort();
  signal?.addEventListener('abort', cleanup);
  timeoutSignal.addEventListener('abort', cleanup);

  try {
    const winning = await pickSeedCandidate({
      messages,
      fieldName,
      streamName,
      connectorId,
      flattenedDocs,
      patternExtractionService,
      inferenceClient,
      scopedClusterClient,
      streamsClient,
      fieldsMetadataClient,
      useOtelFieldNames: isOtel,
      signal: compositeAbort.signal,
      logger: log,
    });

    if (!winning) {
      return {
        kind: 'fallback',
        reason: 'no_candidate',
        streamType,
        pickedSourceField: fieldName,
        sourceFieldConflictDetected,
      };
    }

    const designed = await designPostParsePipeline({
      definition,
      streamName,
      winning,
      flattenedDocs,
      useOtelFieldNames: isOtel,
      boundInferenceClient,
      scopedClusterClient,
      streamsClient,
      fieldsMetadataClient,
      signal: compositeAbort.signal,
      logger: log,
    });

    if (!designed) {
      return {
        kind: 'fallback',
        reason: 'no_parsed_documents',
        streamType,
        pickedSourceField: fieldName,
        sourceFieldConflictDetected,
      };
    }

    return assembleSuccessOutcome({
      streamName,
      streamType,
      fieldName,
      sourceFieldConflictDetected,
      existingSteps,
      flattenedDocs,
      documentStatus,
      samplesInfo,
      winning,
      suggestion: designed.suggestion,
      parsedDocuments: designed.parsedDocuments,
      scopedClusterClient,
      streamsClient,
      fieldsMetadataClient,
    });
  } finally {
    signal?.removeEventListener('abort', cleanup);
    timeoutSignal.removeEventListener('abort', cleanup);
  }
};

// ---------------------------------------------------------------------------
// Phase 1: parallel grok + dissect heuristics + LLM review
// ---------------------------------------------------------------------------

interface PickSeedCandidateArgs {
  messages: string[];
  fieldName: string;
  streamName: string;
  connectorId: string;
  flattenedDocs: FlattenRecord[];
  patternExtractionService: IPatternExtractionService;
  inferenceClient: InferenceClient;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  useOtelFieldNames: boolean;
  signal: AbortSignal;
  logger: Logger;
}

/**
 * Run grok and dissect heuristic extraction in parallel against the same
 * sample messages, then return whichever candidate parsed more documents.
 * Returns `null` when neither branch produced a usable seed pattern (the
 * caller turns that into a `fallback` outcome).
 */
const pickSeedCandidate = async ({
  messages,
  fieldName,
  streamName,
  connectorId,
  flattenedDocs,
  patternExtractionService,
  inferenceClient,
  scopedClusterClient,
  streamsClient,
  fieldsMetadataClient,
  useOtelFieldNames,
  signal,
  logger,
}: PickSeedCandidateArgs): Promise<SeedParsingCandidate | null> => {
  logger.debug(
    `Scheduling parallel grok + dissect extraction (stream=${streamName} messages=${messages.length} fieldName=${fieldName})`
  );

  const commonArgs = {
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
    useOtelFieldNames,
    signal,
    logger,
  };

  const settled = await Promise.allSettled<SeedParsingCandidate | null>([
    processGrokPatterns(commonArgs),
    processDissectPattern(commonArgs),
  ]);

  const candidates: SeedParsingCandidate[] = [];
  for (const settledResult of settled) {
    if (settledResult.status === 'fulfilled' && settledResult.value !== null) {
      candidates.push(settledResult.value);
    } else if (settledResult.status === 'rejected') {
      const { reason } = settledResult;
      if (isNoLLMSuggestionsError(reason)) {
        logger.debug(`No LLM suggestions available (stream=${streamName})`);
      } else {
        logger.error(
          `Candidate failed (stream=${streamName}${formatInferenceErrorMeta(
            reason
          )}): ${getErrorMessage(reason)}`
        );
      }
    }
  }

  if (candidates.length === 0) {
    logger.debug(`No seed candidate produced (stream=${streamName}); falling back`);
    return null;
  }

  candidates.sort((a, b) => b.parsedRate - a.parsedRate);
  const winning = candidates[0];
  logger.debug(
    `Selected ${winning.type} processor (stream=${streamName} parsedRate=${winning.parsedRate})`
  );
  return winning;
};

// ---------------------------------------------------------------------------
// Phase 2: post-parse reasoning agent
// ---------------------------------------------------------------------------

interface DesignPostParsePipelineArgs {
  definition: Streams.ingest.all.Definition;
  streamName: string;
  winning: SeedParsingCandidate;
  flattenedDocs: FlattenRecord[];
  useOtelFieldNames: boolean;
  boundInferenceClient: BoundInferenceClient;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  signal: AbortSignal;
  logger: Logger;
}

interface DesignPostParsePipelineResult {
  parsedDocuments: FlattenRecord[];
  suggestion: SuggestProcessingPipelineResult;
}

/**
 * Simulate the seed parser against the sample docs to materialise the
 * post-parse view, then hand that view (plus mapped fields and a dataset
 * overview) to the streams-ai reasoning sub-agent. Returns `null` when the
 * seed simulation produced no usable parsed docs; the caller turns that
 * into a `fallback` outcome.
 */
const designPostParsePipeline = async ({
  definition,
  streamName,
  winning,
  flattenedDocs,
  useOtelFieldNames,
  boundInferenceClient,
  scopedClusterClient,
  streamsClient,
  fieldsMetadataClient,
  signal,
  logger,
}: DesignPostParsePipelineArgs): Promise<DesignPostParsePipelineResult | null> => {
  const { parsedDocuments, definitionError } = await extractParsedSampleDocuments({
    streamName,
    documents: flattenedDocs,
    parsingProcessor: winning.processor,
    scopedClusterClient,
    streamsClient,
    fieldsMetadataClient,
    logger,
  });

  if (definitionError || parsedDocuments.length === 0) {
    logger.debug(
      `Seed simulation produced no parsed docs (stream=${streamName} definitionError=${definitionError}); falling back`
    );
    return null;
  }

  const mappedFields = await fetchMappedFieldsForStreamProcessingSuggestions(
    scopedClusterClient.asCurrentUser,
    streamName
  );

  const initialDatasetAnalysisJson = JSON.stringify(
    await buildDocumentStructureOverviewForPipelinePrompt(
      parsedDocuments,
      fieldsMetadataClient,
      useOtelFieldNames,
      mappedFields
    )
  );

  const suggestion = await suggestProcessingPipeline({
    definition,
    inferenceClient: boundInferenceClient,
    agentPipelineSchema: postParsePipelineDefinitionSchema,
    maxSteps: SUB_AGENT_MAX_STEPS,
    maxDurationMs: SUB_AGENT_MAX_DURATION_MS,
    signal,
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

  return { parsedDocuments, suggestion };
};

// ---------------------------------------------------------------------------
// Phase 3: merge, simulate, build warnings, format result
// ---------------------------------------------------------------------------

interface AssembleSuccessOutcomeArgs {
  streamName: string;
  streamType: StreamType;
  fieldName: string;
  sourceFieldConflictDetected: boolean;
  existingSteps: StreamlangStep[];
  flattenedDocs: FlattenRecord[];
  documentStatus: 'processed' | 'unprocessed';
  samplesInfo: { source: 'stream' | 'inline'; count: number };
  winning: SeedParsingCandidate;
  suggestion: SuggestProcessingPipelineResult;
  parsedDocuments: FlattenRecord[];
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
}

/**
 * Merge the seed parser into the proposed sub-agent pipeline, simulate the
 * combined result against the original sample docs, and assemble the final
 * `success` outcome. All placement / duplication / overwrite warnings are
 * computed here and folded into `result.warnings`.
 *
 * Existing steps keep their original position whenever it is structurally
 * safe to do so — appending new extraction at the END preserves user
 * intent for the common case where existing steps decorate or transform
 * attributes.* and do not touch the seed source field.
 *
 * Safety override: if any existing step writes to, renames away from, or
 * removes the seed source field (typically `body.text`), the new
 * extraction must run BEFORE those steps; otherwise the source would be
 * mutated or dropped before grok/dissect could read it. In that case we
 * fall back to prepending new extraction at the start.
 *
 * `addDeterministicCustomIdentifiers` ensures every step (new + existing)
 * carries a `customIdentifier` that the transpiler turns into an ingest
 * processor `tag`. Without tags the simulation framework cannot recognize
 * a processor as "successful" (it requires `!!processor.tag`), so a single
 * untagged existing step would mis-classify every doc as
 * `partially_parsed` and report a 0% success rate even when every
 * processor ran cleanly.
 *
 * Side-effect to be aware of: this helper strips every pre-existing
 * `customIdentifier` and re-assigns purely from position in the merged
 * list (`root.steps[i]`). The existing-step identifiers the caller passed
 * in (from disk) do NOT survive the merge — the steps the user sees back
 * carry fresh path-derived ids. This is benign as long as downstream code
 * never treats `customIdentifier` as a stable cross-call handle for "is
 * this the same existing step". Today every matcher that compares
 * existing vs proposed steps strips `customIdentifier` before comparing
 * (`structuralKey` in `injectIgnoreFailure`, `SIGNATURE_IGNORED_KEYS` in
 * `pipeline_diff.ts`), so the identifier swap is invisible. If you ever
 * need stable-identity matching, use those structural helpers, not the
 * identifier string.
 */
const assembleSuccessOutcome = async ({
  streamName,
  streamType,
  fieldName,
  sourceFieldConflictDetected,
  existingSteps,
  flattenedDocs,
  documentStatus,
  samplesInfo,
  winning,
  suggestion,
  parsedDocuments,
  scopedClusterClient,
  streamsClient,
  fieldsMetadataClient,
}: AssembleSuccessOutcomeArgs): Promise<RunExtractFieldsOutcome> => {
  const newlyAdded = suggestion.pipeline
    ? mergeSeedParsingProcessorIntoSuggestedPipeline(winning.processor, suggestion.pipeline)
    : { steps: [{ ...winning.processor }] };

  const sourceFieldUsedByExisting = existingSteps.some((step) =>
    stepWritesOrRemovesField(step, fieldName)
  );
  const merged = addDeterministicCustomIdentifiers({
    steps: sourceFieldUsedByExisting
      ? [...newlyAdded.steps, ...existingSteps]
      : [...existingSteps, ...newlyAdded.steps],
  });

  const shouldSimulatePartial = existingSteps.length > 0 && documentStatus === 'processed';
  const stepsForFinalSimulation = shouldSimulatePartial
    ? addDeterministicCustomIdentifiers({ steps: newlyAdded.steps }).steps
    : merged.steps;
  const simulationMode: SimulationMode = shouldSimulatePartial ? 'partial' : 'complete';

  const finalSimulation = await simulateProcessing({
    params: {
      path: { name: streamName },
      body: { processing: { steps: stepsForFinalSimulation }, documents: flattenedDocs },
    },
    esClient: scopedClusterClient.asCurrentUser,
    streamsClient,
    fieldsMetadataClient,
  });

  const baseFields = extractFieldsFromDocuments(flattenedDocs);
  const fieldChanges = finalSimulation.definition_error
    ? []
    : computeFieldChanges(finalSimulation, baseFields);
  const successRate = finalSimulation.definition_error ? null : computeSuccessRate(finalSimulation);
  const simErrors = finalSimulation.definition_error
    ? [finalSimulation.definition_error.message]
    : extractSimulationErrors(finalSimulation);

  const warnings = buildSuccessOutcomeWarnings({
    suggestion,
    existingSteps,
    sourceFieldUsedByExisting,
    fieldName,
    fieldChanges,
    shouldSimulatePartial,
    simErrors,
    successRate,
  });

  const finalSteps = injectIgnoreFailure(merged.steps, existingSteps);

  // Diff against the pre-existing pipeline so the agent can present a clear
  // before/after view. With the append-existing strategy above the diff is
  // typically all-additions plus all-unchanged, but we still build it to
  // surface any structural mismatch (e.g. a sub-agent surprise) loudly.
  const diff = computePipelineDiff(existingSteps, finalSteps);
  const dropWarnings = buildDropWarnings(diff);

  return {
    kind: 'success',
    streamType,
    pickedSourceField: fieldName,
    sourceFieldConflictDetected,
    stepsUsed: suggestion.metadata.stepsUsed,
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
        mode: simulationMode,
      },
      ...(warnings.length + dropWarnings.length > 0 && {
        warnings: [...warnings, ...dropWarnings],
      }),
      hints: [
        `Seed parsing was discovered automatically using ${winning.type} heuristics on field "${fieldName}".`,
        ...buildKeyValueHints(parsedDocuments, new Set(fieldChanges.map((change) => change.field))),
      ],
      samples_info: samplesInfo,
    },
  };
};

interface BuildSuccessOutcomeWarningsArgs {
  suggestion: SuggestProcessingPipelineResult;
  existingSteps: StreamlangStep[];
  sourceFieldUsedByExisting: boolean;
  fieldName: string;
  fieldChanges: ReturnType<typeof computeFieldChanges>;
  shouldSimulatePartial: boolean;
  simErrors: string[];
  successRate: number | null;
}

const buildSuccessOutcomeWarnings = ({
  suggestion,
  existingSteps,
  sourceFieldUsedByExisting,
  fieldName,
  fieldChanges,
  shouldSimulatePartial,
  simErrors,
  successRate,
}: BuildSuccessOutcomeWarningsArgs): string[] => {
  const warnings: string[] = [];

  if (!suggestion.pipeline) {
    warnings.push(
      'Post-parse design produced no additional steps. The proposed pipeline contains only the system-discovered seed parsing step.'
    );
  }

  if (existingSteps.length > 0) {
    const placementWarning = buildPlacementWarning({
      existingSteps,
      sourceFieldUsedByExisting,
      fieldName,
    });
    if (placementWarning) warnings.push(placementWarning);

    const duplicationWarning = buildDuplicationWarning({ existingSteps, fieldName });
    if (duplicationWarning) warnings.push(duplicationWarning);

    const overwriteWarning = buildOverwriteWarning(existingSteps, fieldChanges);
    if (overwriteWarning) warnings.push(overwriteWarning);
  }

  if (shouldSimulatePartial) {
    const baseNote =
      'Simulation is partial — only the newly-added extraction steps were simulated, since the sample documents already reflect the existing pipeline output. Existing steps will continue to run as-is at ingest.';
    warnings.push(
      sourceFieldUsedByExisting
        ? `${baseNote} Because an existing step writes to or removes the source field "${fieldName}", the cached samples may have already been mutated; simulation may under-report the success rate that ingest would actually produce.`
        : baseNote
    );
  }

  if (simErrors.length > 0) {
    const rateLabel =
      successRate !== null ? `${successRate}% success rate with` : 'Simulation failed with';
    warnings.push(
      `${rateLabel} ${simErrors.length} error type(s): ${simErrors.slice(0, 3).join('; ')}`
    );
  }

  return warnings;
};

/**
 * Pure-observer source-field conflict telemetry. Returns true when any
 * existing step either extracts from, writes to, or removes the picked
 * source field — i.e. the heuristic is about to run against a field
 * another step has already touched. Does NOT alter pipeline behaviour;
 * the post-fact warnings remain the user-visible surface for resolving
 * conflicts. The signal feeds `source_field_conflict_detected` on the
 * `design_pipeline` EBT event so we can size the conflict rate before
 * deciding whether to ship the upfront-gate UX.
 */
export const detectSourceFieldConflict = (
  existingSteps: StreamlangStep[],
  fieldName: string
): boolean =>
  existingSteps.some(
    (step) => isExtractionStepOnField(step, fieldName) || stepWritesOrRemovesField(step, fieldName)
  );

/**
 * Preferred minimum number of non-null sample values required to consider a
 * key=value pattern genuine. Avoids false positives on fields with very few
 * populated values. The effective threshold may be lowered for streams with
 * a small parsed-document population — see {@link computeKvMinSamples}.
 */
const KV_MIN_SAMPLES = 5;

/**
 * Hard absolute floor on the number of populated values we'll consider —
 * below this, "100% agreement on a prefix" is too easily coincidental to
 * report. Streams with fewer than 3 parsed documents always skip the hint.
 */
const KV_MIN_SAMPLES_FLOOR = 3;

/**
 * Effective minimum-samples threshold for a given parsed-document count.
 * Scales `KV_MIN_SAMPLES` down for small populations while never going
 * below `KV_MIN_SAMPLES_FLOOR`. This lets the hint generator work for
 * sparse streams where, say, only 3 docs ever populate the captured
 * field — without that, the heuristic effectively disables itself for
 * the streams that most benefit from a refinement suggestion.
 */
export const computeKvMinSamples = (parsedDocumentCount: number): number =>
  Math.min(KV_MIN_SAMPLES, Math.max(KV_MIN_SAMPLES_FLOOR, parsedDocumentCount));

/**
 * Fields that are known system/identity fields — skip them even if they
 * happen to contain `=`.
 */
const KV_FIELD_BLOCKLIST_LITERAL = new Set([
  '@timestamp',
  'stream.name',
  'body.text',
  'body.structured.message',
  'message',
  'attributes.original_message',
  'host.name',
]);

const KV_FIELD_BLOCKLIST_URL_SUFFIXES = ['url.path', 'url.full', 'url.original', 'url.query'];

const KV_FIELD_BLOCKLIST_PREFIXES = [
  'attributes.headers.',
  'headers.',
  'resource.attributes.host.',
];

export const isBlockedKvField = (fieldName: string): boolean => {
  if (KV_FIELD_BLOCKLIST_LITERAL.has(fieldName)) return true;
  if (KV_FIELD_BLOCKLIST_PREFIXES.some((prefix) => fieldName.startsWith(prefix))) return true;
  return KV_FIELD_BLOCKLIST_URL_SUFFIXES.some(
    (suffix) => fieldName === suffix || fieldName.endsWith(`.${suffix}`)
  );
};

/**
 * Scans parsed documents for fields where every non-null value follows a
 * consistent `key=value` pattern (e.g. `user=u-1234`). Returns hint strings
 * that the agent surfaces to the user — the user decides whether stripping
 * the prefix is appropriate. No automatic rewriting happens; this keeps
 * destructive value changes under human control.
 *
 * `survivingFields`, when provided, scopes the analysis to fields that
 * actually appear in the final pipeline's output. The seed processor's
 * captures (`parsedDocuments`) may include fields the post-parse sub-agent
 * later renamed or dropped — emitting a hint that names a field no longer
 * present in the proposed pipeline would just mislead the user. Pass
 * `undefined` (or omit) to skip the filter entirely (used by unit tests
 * that exercise the extraction logic in isolation).
 */
export const buildKeyValueHints = (
  parsedDocuments: FlattenRecord[],
  survivingFields?: ReadonlySet<string>
): string[] => {
  const fieldValues = new Map<string, string[]>();

  for (const doc of parsedDocuments) {
    if (!doc) continue;
    for (const [fieldName, value] of Object.entries(doc)) {
      if (isBlockedKvField(fieldName)) continue;
      if (survivingFields && !survivingFields.has(fieldName)) continue;
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

  const minSamples = computeKvMinSamples(parsedDocuments.length);
  const hints: string[] = [];

  for (const [fieldName, values] of fieldValues) {
    if (values.length < minSamples) continue;

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
        `To refine: call refine_extracted_field with field: "${fieldName}", action: "drop_prefix", prefix: "${prefix}", ` +
        `and pipeline_steps: <the \`steps\` array from THIS result> (since this pipeline is still a proposal and not yet applied). ` +
        `This appends a single deterministic step that strips the prefix in-place; no other fields are affected.`
    );
  }

  return hints;
};
