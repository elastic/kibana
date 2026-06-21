/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { StateGraph, Annotation } from '@langchain/langgraph';
import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import type { ScopedModel, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { type IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { generateEsql, executeEsql } from '@kbn/agent-builder-genai-utils';
import { extractTextFromMessage } from '../utils/extract_text_from_message';
import {
  GENERATE_VEGA_ESQL_NODE,
  GENERATE_VEGA_SPEC_NODE,
  VALIDATE_VEGA_SPEC_NODE,
  MAX_VEGA_RETRY_ATTEMPTS,
  type GenerateVegaEsqlAction,
  type GenerateVegaSpecAction,
  type ValidateVegaSpecAction,
  type VegaAction,
  isGenerateVegaSpecAction,
  isValidateVegaSpecAction,
} from './actions_vega';
import { createGenerateVegaSpecPrompt, vegaEsqlAdditionalInstructions } from './prompts_vega';
import { buildEsqlDataUrl } from './vega_data_url';
import { escapeDottedFieldReferences } from './vega_field_escaping';

// Regex to extract JSON from markdown code blocks
const INLINE_JSON_REGEX = /```(?:json)?\s*([\s\S]*?)\s*```/gm;

const VEGA_LITE_V5_SCHEMA = 'https://vega.github.io/schema/vega-lite/v5.json';

/**
 * Top-level Vega-Lite properties that declare something to render. A valid spec
 * must contain at least one of these.
 */
const RENDER_DIRECTIVES = [
  'mark',
  'layer',
  'facet',
  'repeat',
  'concat',
  'vconcat',
  'hconcat',
  'spec',
] as const;

const CONTAINER_SIZE = 'container';

/** Recursively remove `"container"` width/height from a spec and its children. */
const stripContainerSizing = (value: unknown): void => {
  if (Array.isArray(value)) {
    value.forEach(stripContainerSizing);
    return;
  }
  if (value !== null && typeof value === 'object') {
    const node = value as Record<string, unknown>;
    if (node.width === CONTAINER_SIZE) delete node.width;
    if (node.height === CONTAINER_SIZE) delete node.height;
    Object.values(node).forEach(stripContainerSizing);
  }
};

/**
 * Align a spec's sizing with Kibana's Vega renderer to avoid noisy warnings.
 *
 * Container sizing ("width"/"height": "container") only works for single-view
 * and layered specs — Kibana resizes those to fill the panel (autosize "fit")
 * and forces "container" anyway, so set it there (mirroring Kibana) regardless
 * of any fixed size the model emitted. Composed specs (facet/repeat/concat) do
 * NOT support container sizing, so strip any "container" width/height (top-level
 * or in their children); it is ignored by Vega-Lite and only produces "Width/
 * Height container only works for single/layered views" warnings.
 */
const normalizeContainerSizing = (spec: Record<string, unknown>): void => {
  if (!('mark' in spec) && !('layer' in spec)) {
    stripContainerSizing(spec);
    return;
  }

  const { autosize } = spec;
  const autosizeDisabled =
    autosize === 'none' ||
    (autosize !== null &&
      typeof autosize === 'object' &&
      'type' in autosize &&
      autosize.type === 'none');

  if (autosizeDisabled) {
    return;
  }

  spec.width = CONTAINER_SIZE;
  spec.height = CONTAINER_SIZE;
};

const VegaStateAnnotation = Annotation.Root({
  // inputs
  nlQuery: Annotation<string>(),
  index: Annotation<string | undefined>(),
  esql: Annotation<string | undefined>(),
  existingSpec: Annotation<string | undefined>(),
  // internal
  esqlQuery: Annotation<string>(),
  columns: Annotation<EsqlEsqlColumnInfo[] | undefined>(),
  currentAttempt: Annotation<number>({ reducer: (_, newValue) => newValue, default: () => 0 }),
  actions: Annotation<VegaAction[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  // outputs
  validatedSpec: Annotation<string | null>(),
  error: Annotation<string | null>(),
});

type VegaState = typeof VegaStateAnnotation.State;

export const createVegaGraph = (
  model: ScopedModel,
  logger: Logger,
  events: ToolEventEmitter,
  esClient: IScopedClusterClient
) => {
  // Node: resolve the ES|QL query and its result columns.
  const generateEsqlNode = async (state: VegaState) => {
    let action: GenerateVegaEsqlAction;
    try {
      if (state.esql) {
        logger.debug('Executing provided ES|QL query for Vega visualization');
        const { columns } = await executeEsql({
          query: state.esql,
          esClient: esClient.asCurrentUser,
        });
        action = { type: 'generate_esql', success: true, query: state.esql, columns };
      } else {
        logger.debug('Generating ES|QL query for Vega visualization');
        const response = await generateEsql({
          nlQuery: state.nlQuery,
          index: state.index,
          model,
          events,
          logger,
          esClient: esClient.asCurrentUser,
          additionalInstructions: vegaEsqlAdditionalInstructions,
        });

        if (!response.query) {
          action = { type: 'generate_esql', success: false, error: 'No queries generated' };
        } else {
          action = {
            type: 'generate_esql',
            success: true,
            query: response.query,
            columns: response.results?.columns,
          };
        }
      }
    } catch (error) {
      logger.error(`Failed to resolve ES|QL query for Vega: ${error.message}`);
      action = { type: 'generate_esql', success: false, error: error.message };
    }

    return {
      esqlQuery: action.query ?? state.esqlQuery,
      columns: action.columns,
      actions: [action],
    };
  };

  // Node: ask the model to author a Vega-Lite spec.
  const generateSpecNode = async (state: VegaState) => {
    const attempt = state.currentAttempt + 1;
    logger.debug(`Generating Vega spec (attempt ${attempt}/${MAX_VEGA_RETRY_ATTEMPTS})`);

    const previousContext = state.actions
      .filter((action) => isGenerateVegaSpecAction(action) || isValidateVegaSpecAction(action))
      .map((action) => {
        if (isGenerateVegaSpecAction(action)) {
          return `Generation attempt ${action.attempt}: ${
            action.success ? 'SUCCESS' : `FAILED - ${action.error}`
          }`;
        }
        return `Validation attempt ${action.attempt}: ${
          action.success ? 'SUCCESS' : `FAILED - ${action.error}`
        }`;
      })
      .filter(Boolean)
      .join('\n');

    const additionalContext = previousContext
      ? `Previous attempts:\n${previousContext}\n\nFix the issues mentioned above.`
      : undefined;

    const prompt = createGenerateVegaSpecPrompt({
      nlQuery: state.nlQuery,
      esqlQuery: state.esqlQuery,
      columns: state.columns,
      dataUrl: JSON.stringify(buildEsqlDataUrl({ query: state.esqlQuery, columns: state.columns })),
      existingSpec: state.existingSpec,
      additionalContext,
    });

    let action: GenerateVegaSpecAction;
    try {
      const response = await model.chatModel.invoke(prompt);
      const responseText = extractTextFromMessage(response);

      const jsonMatches = Array.from(responseText.matchAll(INLINE_JSON_REGEX));
      const jsonText = jsonMatches.length > 0 ? jsonMatches[0][1].trim() : responseText;
      const spec = JSON.parse(jsonText);

      if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
        throw new Error('Response is not a valid JSON object');
      }

      action = { type: 'generate_spec', success: true, spec, attempt };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`Vega spec generation failed (attempt ${attempt}): ${errorMessage}`);
      action = { type: 'generate_spec', success: false, attempt, error: errorMessage };
    }

    return {
      currentAttempt: attempt,
      actions: [action],
    };
  };

  // Node: validate the generated spec and inject the canonical Kibana data url.
  const validateSpecNode = async (state: VegaState) => {
    const attempt = state.currentAttempt;
    const lastGenerate = [...state.actions].reverse().find(isGenerateVegaSpecAction);

    let action: ValidateVegaSpecAction;
    try {
      if (!lastGenerate?.spec) {
        throw new Error('No spec found to validate');
      }

      const generatedSpec = lastGenerate.spec;
      const hasRenderDirective = RENDER_DIRECTIVES.some((directive) => directive in generatedSpec);
      if (!hasRenderDirective) {
        throw new Error(
          `Spec is missing a rendering directive. Include one of: ${RENDER_DIRECTIVES.join(', ')}.`
        );
      }

      // Escape dots in field references that match dotted ES|QL columns so
      // Vega-Lite reads the flat column instead of attempting nested-object
      // access (e.g. a column named "geo.src" must be referenced as "geo\.src").
      const spec = escapeDottedFieldReferences({ ...generatedSpec }, state.columns);

      // Force the schema and the Kibana ES|QL data source so data binding is
      // always correct regardless of what the model emitted.
      spec.$schema = VEGA_LITE_V5_SCHEMA;
      spec.data = {
        url: buildEsqlDataUrl({ query: state.esqlQuery, columns: state.columns }),
      };

      normalizeContainerSizing(spec);

      action = {
        type: 'validate_spec',
        success: true,
        // Pretty-print so the stored spec string stays human-readable/editable.
        spec: JSON.stringify(spec, null, 2),
        attempt,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`Vega spec validation failed (attempt ${attempt}): ${errorMessage}`);
      action = { type: 'validate_spec', success: false, attempt, error: errorMessage };
    }

    return { actions: [action] };
  };

  const finalizeNode = async (state: VegaState) => {
    const lastValidate = [...state.actions].reverse().find(isValidateVegaSpecAction);
    return {
      validatedSpec: lastValidate?.success ? lastValidate.spec ?? null : null,
      error: lastValidate?.success ? null : lastValidate?.error || null,
    };
  };

  const shouldGenerateEsqlRouter = (state: VegaState): string => {
    if (state.esql) {
      logger.debug('Using provided ES|QL query for Vega');
    }
    return GENERATE_VEGA_ESQL_NODE;
  };

  const shouldRetryRouter = (state: VegaState): string => {
    const lastValidate = [...state.actions].reverse().find(isValidateVegaSpecAction);

    if (lastValidate?.success) {
      return 'finalize';
    }

    if (state.currentAttempt >= MAX_VEGA_RETRY_ATTEMPTS) {
      logger.warn(`Max Vega retry attempts (${MAX_VEGA_RETRY_ATTEMPTS}) reached, finalizing`);
      return 'finalize';
    }

    return GENERATE_VEGA_SPEC_NODE;
  };

  const graph = new StateGraph(VegaStateAnnotation)
    .addNode(GENERATE_VEGA_ESQL_NODE, generateEsqlNode)
    .addNode(GENERATE_VEGA_SPEC_NODE, generateSpecNode)
    .addNode(VALIDATE_VEGA_SPEC_NODE, validateSpecNode)
    .addNode('finalize', finalizeNode)
    .addConditionalEdges('__start__', shouldGenerateEsqlRouter, {
      [GENERATE_VEGA_ESQL_NODE]: GENERATE_VEGA_ESQL_NODE,
    })
    .addEdge(GENERATE_VEGA_ESQL_NODE, GENERATE_VEGA_SPEC_NODE)
    .addEdge(GENERATE_VEGA_SPEC_NODE, VALIDATE_VEGA_SPEC_NODE)
    .addConditionalEdges(VALIDATE_VEGA_SPEC_NODE, shouldRetryRouter, {
      [GENERATE_VEGA_SPEC_NODE]: GENERATE_VEGA_SPEC_NODE,
      finalize: 'finalize',
    })
    .addEdge('finalize', '__end__')
    .compile();

  return graph;
};
