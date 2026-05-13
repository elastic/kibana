/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server';
import {
  Streams,
  getStreamTypeFromDefinition,
  type FlattenRecord,
  type StreamType,
} from '@kbn/streams-schema';
import type { StreamlangStep } from '@kbn/streamlang/types/streamlang';
import type { StreamsClient } from '../../../lib/streams/client';
import type { GetScopedClients } from '../../../routes/types';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import { simulateProcessing } from '../../../routes/internal/streams/processing/simulation_handler';
import { STREAMS_REFINE_EXTRACTED_FIELD_TOOL_ID as REFINE_EXTRACTED_FIELD } from '../tool_ids';
import { classifyError } from '../../utils/error_utils';
import {
  annotateWithDiff,
  buildSummary,
  computeFieldChanges,
  computeSuccessRate,
  extractFieldsFromDocuments,
  extractSimulationErrors,
  injectIgnoreFailure,
  resolveSamples,
  type NlToStreamlangResult,
  type SamplesConfig,
} from './_pipeline_design_utils';

/**
 * Minimum number of populated, non-null sample values required before we'll
 * accept a refinement. The same floor is used by `buildKeyValueHints` so a
 * field that emitted a hint is guaranteed to also pass refinement validation
 * (assuming the values are still consistent at refinement time).
 */
const MIN_SAMPLE_VALUES = 5;

/**
 * Outer cap on prefix length. The hint generator inspects raw seed-processor
 * output, so a runaway value (e.g. an entire JSON blob) could in theory be
 * interpreted as a "prefix". Capping at 64 chars keeps the regex anchor
 * reasonable and rejects almost any obvious garbage value the LLM might pass.
 */
const PREFIX_MAX_LENGTH = 64;

/**
 * Per-value cap when echoing sampled field values back to the agent in
 * rejection messages. The tool's rejection text travels three places that
 * are NOT the user's own browser:
 *  - The agent transcript (and from there the LLM provider's prompt logs).
 *  - Server logs, which may be shipped to a SIEM.
 *  - Any future UI component that surfaces tool errors verbatim.
 * Customers may have PII / secrets in their log fields, so unbounded raw
 * values are an exfiltration risk. We still need *some* of the value to
 * be useful for debugging ("oh, it's `session=...` not `user=...`"), so we
 * truncate per-value rather than redact entirely.
 */
const MISMATCH_EXAMPLE_MAX_LENGTH = 60;

/**
 * Render a sampled value as a JSON string for inclusion in a rejection
 * message, truncating values longer than {@link MISMATCH_EXAMPLE_MAX_LENGTH}
 * and annotating the original length so the caller still has a signal.
 */
const formatMismatchExample = (value: string): string => {
  if (value.length <= MISMATCH_EXAMPLE_MAX_LENGTH) {
    return JSON.stringify(value);
  }
  return `${JSON.stringify(
    value.slice(0, MISMATCH_EXAMPLE_MAX_LENGTH)
  )} (truncated, original length ${value.length})`;
};

const samplesSchema = z
  .union([
    z.object({
      source: z.literal('stream'),
      size: z.number().int().min(1).max(500).optional(),
    }),
    z.object({
      source: z.literal('inline'),
      documents: z.array(z.record(z.string(), z.unknown())).max(500),
      status: z.enum(['processed', 'unprocessed']),
    }),
  ])
  .optional()
  .describe(
    'How to obtain sample documents for validation + simulation. ' +
      'Omit to auto-fetch 100 recent documents from the stream (recommended). ' +
      'Use { source: "inline", documents, status: "processed"|"unprocessed" } to provide your own samples.'
  );

const refineExtractedFieldSchema = z.object({
  stream_name: z.string().describe('Exact stream name, e.g. "logs.otel.linux".'),
  field: z
    .string()
    .min(1)
    .describe(
      'Exact field name to refine, as it appears in the pipeline output ' +
        '(e.g. "attributes.user.id"). Must already be produced either by the stream\'s ' +
        'live pipeline OR by the steps passed via `pipeline_steps` (when refining a ' +
        'still-proposed pipeline).'
    ),
  action: z
    .literal('drop_prefix')
    .describe(
      'Refinement to apply. Currently the only supported action is `drop_prefix`, which ' +
        'strips a literal `<prefix>=` from the start of each value (in-place).'
    ),
  prefix: z
    .string()
    .min(1)
    .max(PREFIX_MAX_LENGTH)
    .describe(
      'Literal prefix WITHOUT the trailing "=", e.g. "user" for values like "user=u-1234". ' +
        'Refinement is REJECTED if any sampled value of the field does not start with `<prefix>=`.'
    ),
  pipeline_steps: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe(
      'OPTIONAL: the pipeline that the refinement should be composed onto. ' +
        'Pass this when refining a pipeline that is still a PROPOSAL (e.g. the `steps` ' +
        'array returned by a prior `design_pipeline` call that the user has not yet ' +
        'applied). The tool will simulate this pipeline against the samples to validate ' +
        'the refinement, and the returned `steps` will be `pipeline_steps` + the new ' +
        'replace step (so the agent can pass the result straight to the update stream ' +
        "tool in one apply). Omit when refining a field already produced by the stream's " +
        'currently-applied pipeline.'
    ),
  samples: samplesSchema,
});

export type RefineExtractedFieldParams = z.infer<typeof refineExtractedFieldSchema>;

/**
 * Output of the underlying flow — mirrors {@link RunExtractFieldsOutcome}'s
 * shape so the same telemetry + result handling pattern in the tool wrapper
 * works uniformly across the read tools.
 */
export type RefineExtractedFieldOutcome =
  | { kind: 'success'; result: NlToStreamlangResult; streamType: StreamType }
  | {
      kind: 'rejected';
      streamType: StreamType;
      reason:
        | 'unsupported_stream'
        | 'no_samples'
        | 'field_not_found'
        | 'insufficient_samples'
        | 'prefix_mismatch';
      message: string;
    };

export interface RunRefineExtractedFieldDeps {
  streamsClient: StreamsClient;
  scopedClusterClient: IScopedClusterClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  logger: Logger;
}

/**
 * Escape a literal user-supplied string so it can safely appear inside a
 * regex source. Covers every metacharacter recognized by the Painless
 * `Pattern` class (used by the `replace` ingest processor) — anchors,
 * quantifiers, character classes, alternation, groups, and escape itself.
 */
const escapeRegex = (literal: string): string => literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Pull the value of `field` from each parsed sample document, returning only
 * non-null string values (the prefix-strip transform only makes sense on
 * strings).
 */
const collectStringValues = (
  documents: ReadonlyArray<{ value: FlattenRecord }>,
  field: string
): string[] => {
  const values: string[] = [];
  for (const doc of documents) {
    const raw = doc.value?.[field];
    if (typeof raw === 'string' && raw.length > 0) {
      values.push(raw);
    }
  }
  return values;
};

/**
 * Build the deterministic streamlang `replace` step that strips a literal
 * `<prefix>=` from the start of `field` (in-place). Anchored at `^` so we
 * never accidentally strip a prefix that happens to appear mid-value.
 */
const buildDropPrefixStep = (field: string, prefix: string): StreamlangStep =>
  ({
    action: 'replace',
    from: field,
    pattern: `^${escapeRegex(prefix)}=`,
    replacement: '',
  } as unknown as StreamlangStep);

/**
 * Core flow: fetch the stream, validate the requested refinement against
 * actual sample values, append a single `replace` step, and re-simulate.
 *
 * Validation is deliberately strict: if any populated value of the target
 * field doesn't start with `<prefix>=`, we reject rather than silently
 * applying a half-transform. The user (via the agent) can then revisit the
 * suggestion before something destructive lands at ingest.
 */
export const runRefineExtractedFieldFlow = async (
  params: RefineExtractedFieldParams,
  deps: RunRefineExtractedFieldDeps
): Promise<RefineExtractedFieldOutcome> => {
  const { stream_name: streamName, field, prefix } = params;
  const { streamsClient, scopedClusterClient, fieldsMetadataClient, logger } = deps;
  const log = logger.get('refine_extracted_field');
  const esClient = scopedClusterClient.asCurrentUser;

  const definition = await streamsClient.getStream(streamName);
  const streamType = getStreamTypeFromDefinition(definition);

  if (!Streams.ingest.all.Definition.is(definition)) {
    return {
      kind: 'rejected',
      streamType,
      reason: 'unsupported_stream',
      message:
        'refine_extracted_field is only supported for ingest streams (wired or classic). ' +
        `"${streamName}" is not an ingest stream.`,
    };
  }

  const liveSteps = definition.ingest.processing.steps;
  // Caller-supplied pipeline (e.g. a still-proposed `design_pipeline` result)
  // overrides the live pipeline as the baseline we refine onto. When omitted
  // we fall back to the stream's currently-applied pipeline — that's the
  // post-apply refinement path.
  const callerPipelineSteps = params.pipeline_steps as StreamlangStep[] | undefined;
  const effectiveExistingSteps: StreamlangStep[] = callerPipelineSteps ?? liveSteps;

  const { documents, documentStatus, samplesInfo } = await resolveSamples(
    params.samples as SamplesConfig | undefined,
    streamName,
    esClient
  );

  if (documents.length === 0) {
    return {
      kind: 'rejected',
      streamType,
      reason: 'no_samples',
      message: `No sample documents available for stream "${streamName}". Cannot validate the refinement.`,
    };
  }

  const flattenedDocs = documents as FlattenRecord[];

  // Do the cached samples already reflect `effectiveExistingSteps`?
  //
  // - Empty pipeline: nothing to simulate; raw docs ARE the output.
  // - `documentStatus === 'processed'` AND no caller-supplied
  //   `pipeline_steps`: stream-sourced (or inline-asserted) samples reflect
  //   the LIVE pipeline, which IS `effectiveExistingSteps` in this branch.
  // - Anything else (notably: caller supplied `pipeline_steps` that differ
  //   from the live pipeline, OR samples are explicitly `unprocessed`): we
  //   must run a baseline simulation against `effectiveExistingSteps` to
  //   produce the field values we'll validate against.
  const samplesReflectEffectiveExisting =
    effectiveExistingSteps.length === 0 ||
    (documentStatus === 'processed' && callerPipelineSteps === undefined);

  const baselineSimulation = samplesReflectEffectiveExisting
    ? null
    : await simulateProcessing({
        params: {
          path: { name: streamName },
          body: { processing: { steps: effectiveExistingSteps }, documents: flattenedDocs },
        },
        esClient,
        streamsClient,
        fieldsMetadataClient,
      });

  const valueSource: ReadonlyArray<{ value: FlattenRecord }> =
    baselineSimulation && baselineSimulation.documents.length > 0
      ? baselineSimulation.documents.map((doc) => ({ value: doc.value }))
      : flattenedDocs.map((doc) => ({ value: doc }));

  const observedValues = collectStringValues(valueSource, field);

  if (observedValues.length === 0) {
    return {
      kind: 'rejected',
      streamType,
      reason: 'field_not_found',
      message:
        `Field "${field}" was not found (or had no string values) in any of the ` +
        `${flattenedDocs.length} sample document(s). ` +
        (callerPipelineSteps === undefined
          ? `Refinement requires the field to already be produced by the stream's currently-applied pipeline. ` +
            `If the field only exists in a still-proposed pipeline (e.g. the result of a prior design_pipeline call), ` +
            `pass that proposal's steps array as the \`pipeline_steps\` argument.`
          : `The supplied \`pipeline_steps\` did not produce "${field}" against the sampled documents.`),
    };
  }

  if (observedValues.length < MIN_SAMPLE_VALUES) {
    return {
      kind: 'rejected',
      streamType,
      reason: 'insufficient_samples',
      message:
        `Only ${observedValues.length} sample value(s) found for "${field}" — need at least ` +
        `${MIN_SAMPLE_VALUES} to validate the refinement reliably. Try again with more samples ` +
        `(e.g. samples.size: 200) or wait for more data to arrive.`,
    };
  }

  const literalPrefix = `${prefix}=`;
  const matched = observedValues.filter((value) => value.startsWith(literalPrefix));
  const matchRate = matched.length / observedValues.length;

  if (matched.length !== observedValues.length) {
    const examplesOfMismatch = observedValues
      .filter((value) => !value.startsWith(literalPrefix))
      .slice(0, 3);
    return {
      kind: 'rejected',
      streamType,
      reason: 'prefix_mismatch',
      message:
        `Only ${Math.round(matchRate * 100)}% of "${field}" values start with "${literalPrefix}" ` +
        `(${matched.length} of ${observedValues.length}). Refinement requires 100% to avoid silent ` +
        `half-transforms. Examples that don't match: ${examplesOfMismatch
          .map(formatMismatchExample)
          .join(', ')}.`,
    };
  }

  log.debug(
    `Validated drop_prefix refinement (stream=${streamName} field=${field} prefix="${prefix}" samples=${observedValues.length})`
  );

  const refinementStep = buildDropPrefixStep(field, prefix);
  const proposedSteps = [...effectiveExistingSteps, refinementStep];

  // Use the same partial-vs-complete strategy the extract_fields flow
  // uses: when the cached samples already reflect `effectiveExistingSteps`,
  // we only need to simulate the newly-appended refinement step against
  // them. Otherwise (e.g. the caller passed `pipeline_steps` that differ
  // from the live pipeline) we have to simulate the full proposed
  // pipeline so the success-rate reflects ALL of it.
  const shouldSimulatePartial =
    effectiveExistingSteps.length > 0 && samplesReflectEffectiveExisting;
  const stepsForFinalSimulation = shouldSimulatePartial ? [refinementStep] : proposedSteps;

  const finalSimulation = await simulateProcessing({
    params: {
      path: { name: streamName },
      body: { processing: { steps: stepsForFinalSimulation }, documents: flattenedDocs },
    },
    esClient,
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

  const warnings: string[] = [];
  if (shouldSimulatePartial) {
    warnings.push(
      'Simulation is partial — only the newly-appended refinement step was simulated, since the ' +
        'sample documents already reflect the existing pipeline output. Existing steps will ' +
        'continue to run as-is at ingest.'
    );
  }
  if (simErrors.length > 0) {
    const rateLabel =
      successRate !== null ? `${successRate}% success rate with` : 'Simulation failed with';
    warnings.push(
      `${rateLabel} ${simErrors.length} error type(s): ${simErrors.slice(0, 3).join('; ')}`
    );
  }

  // Preserve `ignore_failure` settings on the entire baseline (whether
  // that's the live pipeline or a caller-supplied proposed one). Only the
  // brand-new replace step gets `ignore_failure: true` injected.
  const finalSteps = injectIgnoreFailure(proposedSteps, effectiveExistingSteps);

  // The diff is computed against the LIVE pipeline so the agent can
  // preview the FULL change set the user is about to apply (e.g. the
  // proposed seed grok + the new replace, when refining a still-proposed
  // pipeline). When refining a post-apply field, `effectiveExistingSteps`
  // == `liveSteps` and the diff collapses to "+1 added".
  return {
    kind: 'success',
    streamType,
    result: annotateWithDiff(
      {
        steps: finalSteps,
        summary: buildSummary(finalSteps),
        field_changes: fieldChanges,
        simulation: {
          success_rate: successRate,
          ...(simErrors.length > 0 && { errors: simErrors }),
          sample_count: flattenedDocs.length,
          mode: shouldSimulatePartial ? 'partial' : 'complete',
        },
        ...(warnings.length > 0 && { warnings }),
        hints: [
          `Appended a single deterministic 'replace' step that strips the "${literalPrefix}" ` +
            `prefix from "${field}" in-place. No other fields are affected.`,
        ],
        samples_info: samplesInfo,
      },
      liveSteps
    ),
  };
};

interface CreateRefineExtractedFieldToolArgs {
  getScopedClients: GetScopedClients;
  logger: Logger;
  telemetry: EbtTelemetryClient;
}

export const createRefineExtractedFieldTool = ({
  getScopedClients,
  logger,
  telemetry,
}: CreateRefineExtractedFieldToolArgs): BuiltinToolDefinition<
  typeof refineExtractedFieldSchema
> => ({
  id: REFINE_EXTRACTED_FIELD,
  type: ToolType.builtin,
  description: dedent(`
    Applies a single, deterministic refinement to a field already produced by a pipeline step. Does NOT apply changes — pass the result to the update stream tool to commit.

    The only refinement currently supported is \`drop_prefix\`: append a streamlang \`replace\` step that strips a literal \`<prefix>=\` from the start of every value of the named field, in-place. No other fields are affected and the rest of the pipeline is preserved as-is.

    **When to use:**
    - As a follow-up to a \`design_pipeline\` (\`extract_fields: true\`) result whose \`hints\` array contains "Field X has values like 'k=v' — all share a 'k=' prefix" guidance. The proposed pipeline is usually NOT yet applied, so pass its \`steps\` array as \`pipeline_steps\` (see below). Pass the field, action, and prefix exactly as named in the hint.
    - When the user explicitly asks to "drop the X= prefix" / "strip 'k=' from field Y" / "remove the prefix from this value", and the named field is already produced either by the stream's currently-applied pipeline OR by a still-proposed one.

    **When NOT to use:**
    - The user wants to add new field extraction → use \`design_pipeline\` instead.
    - The refinement is anything other than prefix-stripping (renaming, type conversion, arbitrary regex replace) → use \`design_pipeline\` with \`extract_fields: false\` and a natural-language instruction.
    - The field doesn't exist yet in any proposal → run \`design_pipeline\` first.

    **Refining a still-proposed pipeline:** pass the proposal's \`steps\` array as the optional \`pipeline_steps\` argument. The tool will simulate that pipeline against the samples to validate the refinement, and the returned \`steps\` will be \`pipeline_steps\` + the new replace step — apply the whole thing in one call to the update stream tool. Without \`pipeline_steps\`, the tool refines fields produced by the live pipeline only and rejects with a clear message if the field is not present.

    **Validation:** The tool simulates the baseline pipeline (live or \`pipeline_steps\`), collects the field's values across the samples, and rejects the refinement (without modifying anything) if:
    - Fewer than ${MIN_SAMPLE_VALUES} populated string values exist for the field.
    - Any populated value does NOT start with \`<prefix>=\`.

    **Result:** Returns the complete proposed pipeline (baseline + 1 new step), \`existing_steps\` (the LIVE pipeline, so the agent can show the full change set), \`step_changes\`, simulation results, and any warnings, mirroring the \`design_pipeline\` result shape so the same review + apply flow applies.
  `),
  tags: ['streams'],
  schema: refineExtractedFieldSchema,
  handler: async (params, { request }) => {
    // Telemetry mirrors the single-emission pattern from design_pipeline:
    // exactly one event per invocation regardless of which validation
    // branch fires (success, rejection, or thrown error). Defaults are
    // overwritten in-place by the success / rejection branches below.
    const startTime = Date.now();
    let success = false;
    let streamType: StreamType = 'unknown';

    try {
      const { streamsClient, scopedClusterClient, fieldsMetadataClient } = await getScopedClients({
        request,
      });

      const outcome = await runRefineExtractedFieldFlow(params, {
        streamsClient,
        scopedClusterClient,
        fieldsMetadataClient,
        logger,
      });

      streamType = outcome.streamType;

      if (outcome.kind === 'rejected') {
        // A rejection is a *deliberate* refusal to apply something
        // destructive (e.g. prefix mismatch) — surface it as a tool
        // error so the agent presents the reason to the user instead of
        // silently treating the run as a successful no-op.
        success = true;
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                stream: params.stream_name,
                operation: 'refine_extracted_field',
                message: outcome.message,
                likely_cause: outcome.reason,
              },
            },
          ],
        };
      }

      success = true;
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              stream: params.stream_name,
              ...outcome.result,
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
              stream: params.stream_name,
              operation: 'refine_extracted_field',
              message: `Failed to refine field "${params.field}" on stream "${params.stream_name}": ${message}`,
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    } finally {
      telemetry.trackProcessingPipelineSuggested({
        duration_ms: Date.now() - startTime,
        // No agent reasoning involved — refinement is fully deterministic.
        // `0` is the right semantic value for "no LLM steps used".
        steps_used: 0,
        success,
        stream_name: params.stream_name,
        stream_type: streamType,
        source: 'agent',
        flow: 'refine_extracted_field',
      });
    }
  },
});
