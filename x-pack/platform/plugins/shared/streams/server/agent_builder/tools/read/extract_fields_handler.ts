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
} from '@kbn/streams-ai';
import {
  addDeterministicCustomIdentifiers,
  isActionBlock,
  isConditionBlock,
  type StreamlangStep,
} from '@kbn/streamlang';
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
  type FieldChange,
  type NlToStreamlangResult,
  type SamplesConfig,
  type SimulationMode,
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
  logger: Logger;
  /** Caller-provided abort signal (e.g. the agent request). */
  signal?: AbortSignal;
}

/**
 * Stream-level metadata the outer handler needs for telemetry, regardless of
 * which outcome variant fires. `streamType` is `'unknown'` only when the
 * stream definition itself could not be classified.
 */
export interface ExtractFieldsOutcomeMeta {
  streamType: StreamType;
}

export type RunExtractFieldsOutcome =
  | ({ kind: 'fallback'; reason: string } & ExtractFieldsOutcomeMeta)
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

  const { documents, documentStatus, samplesInfo } = await resolveSamples(
    params.samples,
    streamName,
    scopedClusterClient.asCurrentUser
  );

  if (documents.length === 0) {
    log.debug(`No sample documents available (stream=${streamName}); falling back`);
    return { kind: 'fallback', reason: 'no_samples', streamType };
  }

  const flattenedDocs = documents as FlattenRecord[];

  const fieldName = getDefaultTextField(flattenedDocs, PRIORITIZED_CONTENT_FIELDS);
  const messages = fieldName ? extractMessagesFromField(flattenedDocs, fieldName) : [];

  if (messages.length === 0) {
    log.debug(
      `No raw text messages found in samples (stream=${streamName} fieldName="${fieldName}"); falling back`
    );
    return { kind: 'fallback', reason: 'no_text_field', streamType };
  }

  // Combine the caller-provided signal with a 3-minute operation timeout so
  // long heuristic runs cannot hang the agent.
  const timeoutSignal = AbortSignal.timeout(OPERATION_TIMEOUT_MS);
  const compositeAbort = new AbortController();
  const cleanup = () => compositeAbort.abort();
  signal?.addEventListener('abort', cleanup);
  timeoutSignal.addEventListener('abort', cleanup);

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
      return { kind: 'fallback', reason: 'no_candidate', streamType };
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
      return { kind: 'fallback', reason: 'no_parsed_documents', streamType };
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

    const stepsUsed = suggestion.metadata.stepsUsed;

    const newlyAdded = suggestion.pipeline
      ? mergeSeedParsingProcessorIntoSuggestedPipeline(winning.processor, suggestion.pipeline)
      : { steps: [{ ...winning.processor }] };

    // Existing steps keep their original position whenever it is structurally
    // safe to do so — appending new extraction at the END preserves user
    // intent for the common case where existing steps decorate or transform
    // attributes.* and do not touch the seed source field.
    //
    // Safety override: if any existing step writes to, renames away from, or
    // removes the seed source field (typically `body.text`), the new
    // extraction must run BEFORE those steps; otherwise the source would be
    // mutated or dropped before grok/dissect could read it. In that case we
    // fall back to prepending new extraction at the start.
    //
    // `addDeterministicCustomIdentifiers` ensures every step (new + existing)
    // carries a `customIdentifier` that the transpiler turns into an ingest
    // processor `tag`. Without tags the simulation framework cannot recognize
    // a processor as "successful" (it requires `!!processor.tag`), so a
    // single untagged existing step would mis-classify every doc as
    // `partially_parsed` and report a 0% success rate even when every
    // processor ran cleanly.
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
      const placement = sourceFieldUsedByExisting
        ? `New extraction was placed BEFORE the ${existingSteps.length} existing step(s) because at least one existing step writes to, renames, or removes the source field "${fieldName}".`
        : `${existingSteps.length} existing step(s) kept their original position; new extraction was appended at the end.`;
      warnings.push(
        `${placement} Review that the new extraction does not duplicate or conflict with existing steps before applying.`
      );
      const conflictingExistingStep = existingSteps.find((step) =>
        isExtractionStepOnField(step, fieldName)
      );
      if (conflictingExistingStep) {
        const conflictingLabel = isConditionBlock(conflictingExistingStep)
          ? 'inside a condition block'
          : (conflictingExistingStep as { action?: string }).action ?? 'step';
        warnings.push(
          `An existing step already extracts from field "${fieldName}" (${conflictingLabel}). The new extraction may duplicate work — confirm with the user before applying.`
        );
      }
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
      stepsUsed,
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
          ...buildKeyValueHints(
            parsedDocuments,
            new Set(fieldChanges.map((change) => change.field))
          ),
        ],
        samples_info: samplesInfo,
      },
    };
  } finally {
    signal?.removeEventListener('abort', cleanup);
    timeoutSignal.removeEventListener('abort', cleanup);
  }
};

/**
 * Detect whether an existing pipeline step already performs grok or dissect
 * extraction from the given source field. Used to warn the agent (and the
 * user) when running heuristic extraction would duplicate or conflict with
 * pre-existing parsing on the same field.
 *
 * Condition blocks recurse into their nested `steps` and `else` branches:
 * a duplicate extraction hidden inside `if log.level == error then grok…`
 * is still worth surfacing to the user. The downstream warning marks the
 * match as "inside a condition block" so the user can judge whether the
 * predicate scopes the duplication.
 */
export const isExtractionStepOnField = (step: unknown, fieldName: string): boolean => {
  if (typeof step !== 'object' || step === null) return false;
  if (isConditionBlock(step as StreamlangStep)) {
    const inner = (step as { condition: { steps?: unknown[]; else?: unknown[] } }).condition;
    return [...(inner.steps ?? []), ...(inner.else ?? [])].some((nested) =>
      isExtractionStepOnField(nested, fieldName)
    );
  }
  const obj = step as { action?: unknown; from?: unknown };
  return (obj.action === 'grok' || obj.action === 'dissect') && obj.from === fieldName;
};

/**
 * Detect whether an existing pipeline step could mutate or remove the seed
 * source field before the new extraction runs. Used by the merge step to
 * decide whether existing steps can keep their position (safe) or must be
 * pushed after the new extraction.
 *
 * Exhaustive over the full `StreamlangProcessorDefinition` discriminated
 * union — adding a new streamlang action without updating this switch is a
 * compile error (the `assertNever` branch). False negatives are unsafe
 * (they let an existing step clobber the seed source before extraction
 * reads it); false positives are merely suboptimal placement.
 *
 * Condition blocks recurse into their nested `steps` and `else` branches:
 * a `set body.text` hidden inside a `where` block must still force
 * defensive prepending.
 */
export const stepWritesOrRemovesField = (step: StreamlangStep, fieldName: string): boolean => {
  if (isConditionBlock(step)) {
    const inner = step.condition.steps ?? [];
    const elseInner = step.condition.else ?? [];
    return [...inner, ...elseInner].some((s) => stepWritesOrRemovesField(s, fieldName));
  }
  if (!isActionBlock(step)) return false;

  switch (step.action) {
    case 'set':
    case 'append':
    case 'math':
    case 'concat':
    case 'enrich':
    case 'join':
      // Always have a required `to` and never mutate a `from`-shaped field.
      return step.to === fieldName;
    case 'rename':
      return step.from === fieldName || step.to === fieldName;
    case 'remove':
      return step.from === fieldName;
    case 'remove_by_prefix':
      return fieldName === step.from || fieldName.startsWith(`${step.from}.`);
    case 'convert':
    case 'date':
    case 'uppercase':
    case 'lowercase':
    case 'trim':
    case 'sort':
    case 'split':
    case 'replace':
      // Optional `to` — when omitted, write happens in-place on `from`.
      return step.to === fieldName || (step.to == null && step.from === fieldName);
    case 'redact':
      // No `to` field — always rewrites `from` in-place.
      return step.from === fieldName;
    case 'network_direction':
      // Default `target_field` in ES is "network.direction" but the
      // streamlang type leaves it optional. If unset we cannot know the
      // resolved field, so be conservative.
      return step.target_field === fieldName || step.target_field == null;
    case 'json_extract':
      return step.extractions.some((extraction) => extraction.target_field === fieldName);
    case 'grok': {
      // Grok READS `from` and writes to whatever names appear in
      // `%{PATTERN:fieldName}` capture syntax. String scan is sufficient —
      // full pattern parsing isn't justified for this conservative check.
      const needle = `:${fieldName}}`;
      return step.patterns.some((pattern) => pattern.includes(needle));
    }
    case 'dissect':
      // Dissect READS `from` and writes to `%{fieldName}` captures (the bare
      // form — modifiers like `%{?ignored}`, `%{+continued}` don't write).
      return step.pattern.includes(`%{${fieldName}}`);
    case 'drop_document':
      // Drops the whole doc, not a specific field — orthogonal to placement.
      return false;
    case 'manual_ingest_pipeline':
      // Opaque — raw ES processors can do anything. Prepend defensively.
      return true;
    default:
      return assertNever(step);
  }
};

/**
 * Enumerate the fields a step is known to write to. Used by the overwrite
 * warning to detect when an existing step's output would clobber a field
 * the new extraction is about to produce.
 *
 * Exhaustive over `StreamlangProcessorDefinition` — adding a new action
 * without updating this switch is a compile error. Returns `[]` for
 * read-only / doc-level / opaque actions: a missing target means "we don't
 * know what this writes, so we cannot specifically warn". The placement
 * decision still protects against silent clobbering of the seed source
 * (see {@link stepWritesOrRemovesField}).
 *
 * Condition blocks union their inner branches' write targets — a nested
 * `set my.field` should still surface in the overwrite warning.
 */
export const getStepWriteTargets = (step: StreamlangStep): string[] => {
  if (isConditionBlock(step)) {
    const inner = step.condition.steps ?? [];
    const elseInner = step.condition.else ?? [];
    return [...new Set([...inner, ...elseInner].flatMap(getStepWriteTargets))];
  }
  if (!isActionBlock(step)) return [];

  switch (step.action) {
    case 'set':
    case 'append':
    case 'math':
    case 'concat':
    case 'enrich':
    case 'join':
      return [step.to];
    case 'rename':
      return [step.to];
    case 'convert':
    case 'date':
    case 'uppercase':
    case 'lowercase':
    case 'trim':
    case 'sort':
    case 'split':
    case 'replace':
      return [step.to ?? step.from];
    case 'redact':
      return [step.from];
    case 'network_direction':
      return step.target_field ? [step.target_field] : [];
    case 'json_extract':
      return [...new Set(step.extractions.map((extraction) => extraction.target_field))];
    case 'grok': {
      // Capture syntax: `%{PATTERN_NAME:field.name}` (with optional
      // `:type` qualifier). The field name is whatever sits between `:`
      // and the closing `}`.
      const targets = new Set<string>();
      const re = /%\{[^:}]+:([^:}]+)(?::[^}]+)?\}/g;
      for (const pattern of step.patterns) {
        let match: RegExpExecArray | null;
        while ((match = re.exec(pattern)) !== null) targets.add(match[1]);
      }
      return [...targets];
    }
    case 'dissect': {
      // Capture syntax: bare `%{field.name}` — modifiers (`+`, `?`, `&`,
      // `*`) don't create a field of that name.
      const targets = new Set<string>();
      const re = /%\{([^?+&*}][^}]*)\}/g;
      let match: RegExpExecArray | null;
      while ((match = re.exec(step.pattern)) !== null) targets.add(match[1]);
      return [...targets];
    }
    case 'remove':
    case 'remove_by_prefix':
    case 'drop_document':
    case 'manual_ingest_pipeline':
      // Removes / drops / opaque — no enumerable write target.
      return [];
    default:
      return assertNever(step);
  }
};

/**
 * Compile-time exhaustiveness guard. The `default` branch of the switches
 * above must call this so adding a new streamlang processor type without
 * updating both helpers fails the type check.
 */
const assertNever = (step: never): never => {
  throw new Error(`Unhandled streamlang step: ${JSON.stringify(step)}`);
};

/**
 * Compose the "may overwrite extracted field" warning when an existing
 * step writes to a field the new extraction is creating. Returns `null`
 * when there is no overlap so the caller can omit the warning entirely.
 *
 * Surfaced regardless of placement order: in either order, the agent and
 * user need to decide whether the existing step is now redundant or
 * should retain precedence.
 */
export const buildOverwriteWarning = (
  existingSteps: StreamlangStep[],
  fieldChanges: FieldChange[]
): string | null => {
  const createdFields = new Set(
    fieldChanges.filter((c) => c.change === 'created').map((c) => c.field)
  );
  if (createdFields.size === 0) return null;

  const overlaps = new Set<string>();
  for (const step of existingSteps) {
    for (const target of getStepWriteTargets(step)) {
      if (createdFields.has(target)) overlaps.add(target);
    }
  }
  if (overlaps.size === 0) return null;

  const fieldList = [...overlaps].map((f) => `"${f}"`).join(', ');
  return (
    `Existing step(s) write to field(s) ${fieldList} that the new extraction also produces. ` +
    `Depending on the step order one will overwrite the other — confirm whether the existing step ` +
    `should be kept, removed, or reordered before applying.`
  );
};

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
