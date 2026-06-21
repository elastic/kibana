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
import { generateEsql, executeEsql, buildTimeRangeParams } from '@kbn/agent-builder-genai-utils';
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
import { buildEsqlDataUrl, extractEsqlQueryFromSpec } from './vega_data_url';
import { escapeDottedFieldReferences } from './vega_field_escaping';
import { validateVegaSpec } from './vega_validator';

// Regex to extract JSON from markdown code blocks
const INLINE_JSON_REGEX = /```(?:json)?\s*([\s\S]*?)\s*```/gm;

const VEGA_V5_SCHEMA = 'https://vega.github.io/schema/vega/v5.json';

/** Name of the base data set bound to the ES|QL query results. */
const ESQL_DATA_NAME = 'source';

/**
 * Default range used only to bind `?_tstart`/`?_tend` when executing an existing
 * query server-side (for columns + sample rows). Mirrors the ES|QL generator
 * default; the live dashboard range is applied by Kibana at render time.
 */
const DEFAULT_VALIDATION_TIME_RANGE = { from: 'now-24h', to: 'now' } as const;

/**
 * Drop any top-level "width"/"height" so Kibana sizes the chart to its panel.
 *
 * Kibana's Vega renderer resizes raw-Vega specs to fill the container (autosize
 * "fit") and forces width/height to "container", warning when a fixed top-level
 * size is set. Scales bound to the view size (range: "width"/"height") then
 * follow the panel, so removing the top-level dimensions keeps the chart
 * responsive without warnings.
 */
const removeTopLevelSizing = (spec: Record<string, unknown>): void => {
  delete spec.width;
  delete spec.height;
};

/** Shape of a raw-Vega data set entry (only the parts we touch). */
interface VegaDataSet {
  name?: string;
  url?: unknown;
  values?: unknown;
  source?: unknown;
}

/**
 * Bind the canonical Kibana ES|QL `url` onto the base data set named `source`
 * (which derived data sets read from). Authoring the data binding here rather
 * than trusting the model guarantees the query/time-range wiring is correct.
 * Returns `false` when the spec has no `source` data set so the caller can
 * request a retry.
 */
const injectEsqlDataSource = (spec: Record<string, unknown>, url: unknown): boolean => {
  if (!Array.isArray(spec.data)) {
    return false;
  }

  const source = spec.data.find(
    (dataSet): dataSet is VegaDataSet =>
      dataSet !== null && typeof dataSet === 'object' && dataSet.name === ESQL_DATA_NAME
  );

  if (!source) {
    return false;
  }

  source.url = url;
  delete source.values;
  delete source.source;
  return true;
};

/** Convert ES|QL columnar results into Vega-style row objects keyed by column name. */
const toRowObjects = (
  columns: EsqlEsqlColumnInfo[] | undefined,
  values: unknown[][] | undefined
): Array<Record<string, unknown>> => {
  if (!Array.isArray(columns) || !Array.isArray(values)) {
    return [];
  }
  return values.map((row) => {
    const rowObject: Record<string, unknown> = {};
    columns.forEach((column, index) => {
      if (column?.name) {
        rowObject[column.name] = row[index];
      }
    });
    return rowObject;
  });
};

/**
 * Legend symbol channels that Vega reads to lay out the legend symbol. A
 * production-rule array (`[{ test, value }, …]`) is rejected at render time
 * ("Unrecognized signal name: undefined"), so these must be a single
 * value/signal/field object.
 */
const FRAGILE_LEGEND_SYMBOL_CHANNELS = ['size', 'strokeWidth'] as const;

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Collapse a production-rule array to a single rule, preferring the unconditional default. */
const collapseProductionRule = (rules: unknown[]): unknown => {
  const defaultRule = [...rules]
    .reverse()
    .find((rule) => isObjectRecord(rule) && !('test' in rule));
  return defaultRule ?? rules[rules.length - 1];
};

/**
 * Vega cannot parse a Kibana Vega spec in the server process (its module graph
 * uses top-level await), so render-time errors cannot be validated here. This
 * deterministically repairs the one fatal authoring mistake we have hit: a
 * conditional production-rule array on a legend symbol's `size`/`strokeWidth`,
 * which throws at render time. Each is collapsed to its unconditional value.
 */
const normalizeLegendSymbolEncoders = (spec: Record<string, unknown>): void => {
  if (!Array.isArray(spec.legends)) {
    return;
  }

  for (const legend of spec.legends) {
    if (!isObjectRecord(legend) || !isObjectRecord(legend.encode)) {
      continue;
    }
    const symbols = legend.encode.symbols;
    if (!isObjectRecord(symbols)) {
      continue;
    }

    for (const block of Object.values(symbols)) {
      if (!isObjectRecord(block)) {
        continue;
      }
      for (const channel of FRAGILE_LEGEND_SYMBOL_CHANNELS) {
        if (Array.isArray(block[channel])) {
          block[channel] = collapseProductionRule(block[channel] as unknown[]);
        }
      }
    }
  }
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
  /** Result rows (as objects keyed by column name) used to validate the spec. */
  rows: Annotation<Array<Record<string, unknown>> | undefined>(),
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
    let rows: Array<Record<string, unknown>> = [];
    try {
      // On edit, reuse the query already embedded in the existing spec so the
      // data binding stays stable and we don't re-discover an index.
      const existingEsql = state.existingSpec
        ? extractEsqlQueryFromSpec(state.existingSpec)
        : undefined;
      const reusableEsql = state.esql ?? existingEsql;

      if (reusableEsql) {
        logger.debug('Executing existing/provided ES|QL query for Vega visualization');
        // The query may reference the time-picker params (?_tstart/?_tend); bind
        // a default range so it runs server-side (Kibana binds the live range at
        // render time). The range only affects sampled rows, not the stored spec.
        const { columns, values } = await executeEsql({
          query: reusableEsql,
          params: buildTimeRangeParams(DEFAULT_VALIDATION_TIME_RANGE),
          esClient: esClient.asCurrentUser,
        });
        action = { type: 'generate_esql', success: true, query: reusableEsql, columns };
        rows = toRowObjects(columns, values);
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
          rows = toRowObjects(response.results?.columns, response.results?.values);
        }
      }
    } catch (error) {
      logger.error(`Failed to resolve ES|QL query for Vega: ${error.message}`);
      action = { type: 'generate_esql', success: false, error: error.message };
    }

    return {
      esqlQuery: action.query ?? state.esqlQuery,
      columns: action.columns,
      rows,
      actions: [action],
    };
  };

  // Node: ask the model to author a raw Vega spec.
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
        if (!action.success) {
          return `Validation attempt ${action.attempt}: FAILED - ${action.error}`;
        }
        const warningSuffix = action.warnings?.length
          ? ` (warnings to address: ${action.warnings.join('; ')})`
          : '';
        return `Validation attempt ${action.attempt}: SUCCESS${warningSuffix}`;
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

      const marks = generatedSpec.marks;
      if (!Array.isArray(marks) || marks.length === 0) {
        throw new Error('Vega spec must contain a non-empty top-level "marks" array.');
      }

      // Escape dots in field references that match dotted ES|QL columns so Vega
      // reads the flat column instead of attempting nested-object access (e.g. a
      // column named "geo.src" must be referenced as "geo\.src" in "field").
      const spec = escapeDottedFieldReferences({ ...generatedSpec }, state.columns);

      // Force the schema so the spec is always parsed as raw Vega.
      spec.$schema = VEGA_V5_SCHEMA;

      // Bind the canonical Kibana ES|QL url onto the base "source" data set so
      // data binding is correct regardless of what the model emitted.
      const dataSourceBound = injectEsqlDataSource(
        spec,
        buildEsqlDataUrl({ query: state.esqlQuery, columns: state.columns })
      );
      if (!dataSourceBound) {
        throw new Error(
          `Vega spec must declare a base data set named "${ESQL_DATA_NAME}" (in the top-level "data" array) that other data sets derive from.`
        );
      }

      // Let Kibana size the chart to the panel (scales use range "width"/"height").
      removeTopLevelSizing(spec);

      // Repair known render-time-fatal authoring mistakes deterministically as a
      // cheap first line of defense.
      normalizeLegendSymbolEncoders(spec);

      // Compile and run the spec in a worker to catch render-time errors (and
      // collect warnings) before it is stored. Errors trigger a retry; warnings
      // are surfaced as soft feedback to later attempts.
      const { error: vegaError, warnings } = await validateVegaSpec({
        spec,
        rows: state.rows,
        logger,
      });
      if (vegaError) {
        throw new Error(`Vega could not render the spec: ${vegaError}`);
      }

      action = {
        type: 'validate_spec',
        success: true,
        // Pretty-print so the stored spec string stays human-readable/editable.
        spec: JSON.stringify(spec, null, 2),
        attempt,
        warnings,
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
