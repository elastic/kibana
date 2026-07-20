/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { executeEsql } from '@kbn/agent-builder-genai-utils';
import { buildTimeRangeParams } from '@kbn/agent-builder-genai-utils/tools/utils/esql';
import { extractTextFromMessage } from '../utils/extract_text_from_message';
import { generateVisualizationEsql } from '../shared/generate_visualization_esql';
import { normalizeVegaSpec } from './normalize_spec';
import { validateVegaSpec } from './vega_validator';
import { createAuthorVegaSpecPrompt, vegaEsqlAdditionalInstructions } from './prompts';
import { buildReferenceExamplesBlock } from './reference_examples';
import {
  GENERATE_ESQL_NODE,
  SELECT_EXAMPLES_NODE,
  AUTHOR_SPEC_NODE,
  VALIDATE_SPEC_NODE,
  FINALIZE_NODE,
  MAX_RETRY_ATTEMPTS,
  isGenerateEsqlAction,
  isAuthorSpecAction,
  isValidateSpecAction,
  type VegaAction,
  type GenerateEsqlAction,
  type AuthorSpecAction,
  type ValidateSpecAction,
} from './actions';

// Regex to extract JSON from markdown code blocks.
const INLINE_JSON_REGEX = /```(?:json)?\s*([\s\S]*?)\s*```/gm;

/**
 * Default range used only to bind `?_tstart`/`?_tend` when executing a query
 * server-side to collect its result columns. The live dashboard range is applied
 * by Kibana at render time, so this default never reaches the stored spec.
 */
const DEFAULT_VALIDATION_TIME_RANGE = { from: 'now-24h', to: 'now' } as const;

/** Top-level keys that declare a renderable Vega-Lite view. */
const RENDERABLE_VIEW_KEYS = [
  'mark',
  'layer',
  'facet',
  'repeat',
  'concat',
  'hconcat',
  'vconcat',
] as const;

/** Whether a Vega-Lite spec declares something renderable (a mark or composite view). */
const hasRenderableView = (spec: Record<string, unknown>): boolean =>
  RENDERABLE_VIEW_KEYS.some((key) => key in spec);

/**
 * Parse the model response into `{ title?, spec }`. Preferred shape is the
 * prompt envelope; a bare Vega-Lite object is still accepted for retries.
 * An envelope is distinguished from a faceted Vega-Lite chart (which also has
 * a nested `spec`) by the absence of renderable view keys at the top level.
 */
const parseAuthoringResponse = (
  responseText: string
): { spec: Record<string, unknown>; title?: string } => {
  const jsonMatches = Array.from(responseText.matchAll(INLINE_JSON_REGEX));
  const jsonText = jsonMatches.length > 0 ? jsonMatches[0][1].trim() : responseText.trim();
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Response is not a valid JSON object');
  }

  const record = parsed as Record<string, unknown>;
  const nestedSpec = record.spec;
  const isEnvelope =
    nestedSpec !== null &&
    typeof nestedSpec === 'object' &&
    !Array.isArray(nestedSpec) &&
    !hasRenderableView(record);

  if (isEnvelope) {
    const title = typeof record.title === 'string' ? record.title.trim() || undefined : undefined;
    return { spec: nestedSpec as Record<string, unknown>, title };
  }

  if (!hasRenderableView(record)) {
    throw new Error(
      'Response must be { "title": string, "spec": <Vega-Lite> } or a Vega-Lite object with a mark/composite view'
    );
  }

  return { spec: record };
};

const VegaStateAnnotation = Annotation.Root({
  // inputs
  nlQuery: Annotation<string>(),
  index: Annotation<string | undefined>(),
  existingSpec: Annotation<string | undefined>(),
  /** Query recovered from the spec being edited, used as context to (re)generate. */
  existingEsql: Annotation<string | undefined>(),
  chartType: Annotation<SupportedChartType | undefined>(),
  // internal
  /**
   * Whether the model has already been given one authoring pass with the Vega
   * warnings in hand. After that pass we accept its judgment (fix or keep) and
   * stop retrying on warnings, so benign/unavoidable warnings never loop.
   */
  warningsReviewed: Annotation<boolean>({
    reducer: (_, newValue) => newValue,
    default: () => false,
  }),
  esqlQuery: Annotation<string>(),
  columns: Annotation<EsqlEsqlColumnInfo[] | undefined>(),
  currentAttempt: Annotation<number>({ reducer: (_, newValue) => newValue, default: () => 0 }),
  referenceExamples: Annotation<string>({ reducer: (_, newValue) => newValue, default: () => '' }),
  actions: Annotation<VegaAction[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  // outputs
  spec: Annotation<string | null>(),
  title: Annotation<string | null>(),
  error: Annotation<string | null>(),
});

type VegaState = typeof VegaStateAnnotation.State;

/**
 * Build the LangGraph that authors a Vega-Lite spec: resolve an ES|QL query
 * (executing it for its result columns), ask the model to author a spec,
 * structurally check + normalize it, and retry authoring with error feedback
 * until it succeeds or the attempt budget is exhausted.
 */
export const createVegaGraph = async (
  modelProvider: ModelProvider,
  logger: Logger,
  events: ToolEventEmitter,
  esClient: IScopedClusterClient
) => {
  const defaultModel = await modelProvider.getDefaultModel();

  // Resolve the ES|QL query and its result columns. A query may reference
  // time-picker params (?_tstart/?_tend); bind a default range so it runs
  // server-side. Kibana binds the live range at render time.
  const generateESQLNode = async (state: VegaState) => {
    const timeRangeParams = buildTimeRangeParams(DEFAULT_VALIDATION_TIME_RANGE);

    let action: GenerateEsqlAction;

    try {
      let query = state.esqlQuery;
      let columns: EsqlEsqlColumnInfo[] | undefined;

      // A provided query is only trustworthy if it actually runs: the caller may
      // pass an LLM-invented query whose error (e.g. a type mismatch) AST
      // validation never catches. Execute it; if it throws, discard it and fall
      // through to self-correcting generation rather than author a spec around a
      // query that can never render.
      if (query) {
        try {
          logger.debug('Validating provided ES|QL query for Vega visualization');
          ({ columns } = await executeEsql({
            query,
            params: timeRangeParams,
            esClient: esClient.asCurrentUser,
          }));
        } catch (providedError) {
          const message =
            providedError instanceof Error ? providedError.message : String(providedError);
          logger.warn(
            `Provided ES|QL query failed to execute (${message}); regenerating a corrected query`
          );
          query = '';
        }
      }

      // Generate a query when none was provided, or the provided one failed.
      // generateVisualizationEsql self-corrects in a bounded retry loop, so it
      // yields only a query that actually runs (or an error once the budget is
      // spent) — this keeps invalid ES|QL out of a stored spec.
      if (!query) {
        logger.debug('Generating ES|QL query for Vega visualization');
        const generated = await generateVisualizationEsql({
          nlQuery: state.nlQuery,
          // On edit, seed generation with the query recovered from the existing
          // spec so a data-shape edit (e.g. a new breakdown) can modify it
          // instead of being stuck with the original columns.
          existingQueries: state.existingEsql ? [state.existingEsql] : undefined,
          index: state.index,
          modelProvider,
          events,
          logger,
          esClient,
          timeRange: DEFAULT_VALIDATION_TIME_RANGE,
          // Vega must filter rows on the raw source time field itself (Kibana
          // does not do it for us as with Lens); see vegaEsqlAdditionalInstructions.
          extraInstructions: vegaEsqlAdditionalInstructions,
        });
        if (!generated.query) {
          return {
            esqlQuery: state.esqlQuery,
            actions: [
              {
                type: 'generate_esql',
                success: false,
                error: generated.error ?? 'No queries generated',
              },
            ],
          };
        }
        query = generated.query;
        // Reuse the columns from the validation run; execute only if the query
        // was validated without returning rows, since spec authoring needs them.
        columns = generated.columns;
        if (!columns) {
          ({ columns } = await executeEsql({
            query,
            params: timeRangeParams,
            esClient: esClient.asCurrentUser,
          }));
        }
      }

      action = { type: 'generate_esql', success: true, query, columns };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to resolve ES|QL query for Vega: ${message}`);
      action = { type: 'generate_esql', success: false, error: message };
    }

    return {
      esqlQuery: action.query ?? state.esqlQuery,
      columns: action.columns,
      actions: [action],
    };
  };

  // Runs once before the authoring retry loop; the model picks which examples fit.
  const selectExamplesNode = async (state: VegaState) => {
    const referenceExamples = await buildReferenceExamplesBlock({
      nlQuery: state.nlQuery,
      chartType: state.chartType,
      model: defaultModel,
      logger,
    });
    return { referenceExamples };
  };

  const authorSpecNode = async (state: VegaState) => {
    const attempt = state.currentAttempt + 1;
    logger.debug(`Authoring Vega-Lite spec (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`);

    // This authoring pass reviews warnings if any prior validation rendered the
    // spec but Vega emitted warnings. We hand the model every warning and let it
    // judge each one, rather than pre-filtering to a curated list.
    const reviewingWarnings = state.actions.some(
      (action) =>
        isValidateSpecAction(action) && action.success && (action.warnings?.length ?? 0) > 0
    );

    // Feed back authoring and structural-check failures, plus every Vega warning,
    // so the next attempt can fix genuine problems (or consciously keep the spec).
    const previousContext = state.actions
      .filter((action) => isAuthorSpecAction(action) || isValidateSpecAction(action))
      .map((action) => {
        if (isAuthorSpecAction(action)) {
          return action.success
            ? undefined
            : `Authoring attempt ${action.attempt} failed: ${action.error}`;
        }
        if (!action.success) {
          return `Validation attempt ${action.attempt} failed: ${action.error}`;
        }
        if (action.warnings && action.warnings.length > 0) {
          return `Validation attempt ${
            action.attempt
          } rendered, but Vega emitted these warnings:\n${action.warnings
            .map((warning) => `- ${warning}`)
            .join('\n')}`;
        }
        return undefined;
      })
      .filter(Boolean)
      .join('\n');

    const additionalContext = previousContext
      ? `Previous attempts:\n${previousContext}\n\nReturn a single valid JSON object matching the response schema ("title" and "spec"). Fix any error above. For each warning, decide for yourself whether it signals a real authoring mistake (e.g. an encoding or property Vega dropped or ignored) and fix it, or whether it is harmless or unavoidable and can be left as-is (validation runs against empty sample data, so warnings about empty/infinite extents or disabled external data loading are expected). If a warning needs no change, keep that part of the spec unchanged.`
      : undefined;

    const prompt = createAuthorVegaSpecPrompt({
      nlQuery: state.nlQuery,
      esqlQuery: state.esqlQuery,
      columns: state.columns,
      existingSpec: state.existingSpec,
      chartType: state.chartType,
      referenceExamples: state.referenceExamples,
      additionalContext,
    });

    let action: AuthorSpecAction;
    try {
      const response = await defaultModel.chatModel.invoke(prompt);
      const { spec, title } = parseAuthoringResponse(extractTextFromMessage(response));
      action = { type: 'author_spec', success: true, spec, title, attempt };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(
        `Vega spec authoring failed (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}): ${message}`
      );
      action = { type: 'author_spec', success: false, attempt, error: message };
    }

    return {
      currentAttempt: attempt,
      actions: [action],
      // Mark warnings reviewed once this pass carried them as feedback, so the
      // retry router accepts the model's decision instead of looping.
      warningsReviewed: state.warningsReviewed || reviewingWarnings,
    };
  };

  // Structurally check the authored spec (it must declare a renderable view),
  // then normalize (harden) it into the render-ready form that is stored.
  const validateSpecNode = async (state: VegaState) => {
    const attempt = state.currentAttempt;
    const lastAuthor = [...state.actions].reverse().find(isAuthorSpecAction);

    let action: ValidateSpecAction;
    try {
      if (!lastAuthor?.success || !lastAuthor.spec) {
        throw new Error(lastAuthor?.error ?? 'No spec found to validate');
      }

      if (!hasRenderableView(lastAuthor.spec)) {
        throw new Error(
          'Vega-Lite spec must declare a "mark" or a composite view ("layer"/"facet"/"repeat"/"concat"/"hconcat"/"vconcat").'
        );
      }

      // Deterministic hardening: pin schema, bind the canonical ES|QL data
      // source, strip fixed sizing, escape dotted field references.
      const normalized = normalizeVegaSpec({
        spec: lastAuthor.spec,
        esqlQuery: state.esqlQuery,
        columns: state.columns,
      });

      // Compile (Vega-Lite -> Vega) and headless-render the normalized spec to
      // catch compile/render errors a structural check cannot. A render error
      // fails validation so authoring retries with the message as feedback;
      // infra failures/timeouts fail open (no error) so they never block.
      const { error: renderError, warnings } = await validateVegaSpec({
        spec: normalized,
        logger,
      });
      if (renderError) {
        throw new Error(renderError);
      }
      if (warnings.length > 0) {
        logger.debug(`Vega spec validated with warnings: ${warnings.join('; ')}`);
      }

      // Carry every warning so the model can read them all and decide, on one
      // authoring pass, which to fix and which to keep. The spec is still a
      // success, so a warning it chooses to keep never blocks finalizing.
      action = {
        type: 'validate_spec',
        success: true,
        // Pretty-print so the stored/displayed spec stays human-readable.
        spec: JSON.stringify(normalized, null, 2),
        title: lastAuthor.title,
        attempt,
        warnings,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Vega spec validation failed (attempt ${attempt}): ${message}`);
      action = { type: 'validate_spec', success: false, attempt, error: message };
    }

    return { actions: [action] };
  };

  const finalizeNode = async (state: VegaState) => {
    // Specs that passed the structural check + normalization, most recent first.
    const rendered = [...state.actions]
      .reverse()
      .filter(
        (action): action is ValidateSpecAction =>
          isValidateSpecAction(action) && action.success && !!action.spec
      );

    // Prefer the most recent warning-free spec; otherwise fall back to the most
    // recent rendered spec (retries could not clear every warning, but a
    // warning still renders, so return the best we have rather than nothing).
    const chosen = rendered.find((action) => !action.warnings?.length) ?? rendered[0];

    if (chosen?.spec) {
      return { spec: chosen.spec, title: chosen.title ?? null, error: null };
    }

    // Surface an ES|QL resolution failure (an unexecutable query that was never
    // authored into a spec) so the caller gets the real root cause.
    const lastGenerate = [...state.actions].reverse().find(isGenerateEsqlAction);
    if (lastGenerate && !lastGenerate.success) {
      return {
        spec: null,
        title: null,
        error: `Could not resolve a valid ES|QL query for the visualization: ${
          lastGenerate.error ?? 'Unknown error'
        }`,
      };
    }

    const lastValidate = [...state.actions].reverse().find(isValidateSpecAction);
    return {
      spec: null,
      title: null,
      error: lastValidate?.error ?? 'Failed to author a valid Vega specification',
    };
  };

  // A query that could not be resolved/executed must not be authored into a
  // spec (the spec would only fail at render), so route straight to finalize.
  const afterGenerateEsqlRouter = (state: VegaState): string => {
    const lastGenerate = [...state.actions].reverse().find(isGenerateEsqlAction);
    if (!lastGenerate?.success) {
      logger.warn('ES|QL resolution failed; finalizing without authoring a Vega spec');
      return FINALIZE_NODE;
    }
    return AUTHOR_SPEC_NODE;
  };

  const shouldRetryRouter = (state: VegaState): string => {
    const lastValidate = [...state.actions].reverse().find(isValidateSpecAction);

    // Retry authoring when the spec failed the structural check / render. When it
    // rendered with warnings, retry once to hand the model every warning and let
    // it decide (fix or keep) — but only until that review pass has happened, so
    // warnings the model chooses to keep never loop. All bounded by the budget.
    const hasWarnings = (lastValidate?.warnings?.length ?? 0) > 0;
    const needsRepair = !lastValidate?.success || (hasWarnings && !state.warningsReviewed);

    if (!needsRepair) {
      return FINALIZE_NODE;
    }

    if (state.currentAttempt >= MAX_RETRY_ATTEMPTS) {
      logger.warn(`Max retry attempts (${MAX_RETRY_ATTEMPTS}) reached, finalizing`);
      return FINALIZE_NODE;
    }

    return AUTHOR_SPEC_NODE;
  };

  return new StateGraph(VegaStateAnnotation)
    .addNode(GENERATE_ESQL_NODE, generateESQLNode)
    .addNode(SELECT_EXAMPLES_NODE, selectExamplesNode)
    .addNode(AUTHOR_SPEC_NODE, authorSpecNode)
    .addNode(VALIDATE_SPEC_NODE, validateSpecNode)
    .addNode(FINALIZE_NODE, finalizeNode)
    .addEdge('__start__', GENERATE_ESQL_NODE)
    .addEdge('__start__', SELECT_EXAMPLES_NODE)
    .addConditionalEdges(GENERATE_ESQL_NODE, afterGenerateEsqlRouter, {
      [AUTHOR_SPEC_NODE]: AUTHOR_SPEC_NODE,
      [FINALIZE_NODE]: FINALIZE_NODE,
    })
    .addEdge(AUTHOR_SPEC_NODE, VALIDATE_SPEC_NODE)
    .addConditionalEdges(VALIDATE_SPEC_NODE, shouldRetryRouter, {
      [AUTHOR_SPEC_NODE]: AUTHOR_SPEC_NODE,
      [FINALIZE_NODE]: FINALIZE_NODE,
    })
    .addEdge(FINALIZE_NODE, '__end__')
    .compile();
};
