/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EffortLevels } from '@kbn/agent-builder-common';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ModelProvider } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { extractTextFromMessage } from '../utils/extract_text_from_message';
import { applyMergePatch } from './apply_merge_patch';
import type { CapabilitySchemaFragment } from './capabilities';
import { capabilityForErrorPath, configUsesCapability, getSchemaFragments } from './capabilities';
import type { VisualizationConfig } from './chart_type_registry';
import { chartTypeRegistry } from './chart_type_registry';
import { getEsqlDataSourceCarriers } from './esql_data_source';
import type { MicroEditRepairContext } from './prompts';
import { createMicroEditPrompt } from './prompts';

/** One initial attempt plus one repair retry — the micro path never loops further. */
const MICRO_EDIT_MAX_ATTEMPTS = 2;

// Regex to extract JSON from markdown code blocks (same contract as graph_lens).
const INLINE_JSON_REGEX = /```(?:json)?\s*([\s\S]*?)\s*```/gm;

// kbn-config-schema validation messages mark every failing path as `[path.to.field]:`.
const VALIDATION_ERROR_PATH_REGEX = /\[([\w.]+)\]:/g;

export interface MicroEditParams {
  /** The edit instruction, e.g. "move the legend to the bottom". */
  nlQuery: string;
  chartType: SupportedChartType;
  existingConfig: VisualizationConfig;
  modelProvider: ModelProvider;
  logger: Logger;
}

export type MicroEditResult =
  | {
      outcome: 'patched';
      validatedConfig: VisualizationConfig;
      /** The unchanged ES|QL query carried over from the existing config. */
      esqlQuery: string;
    }
  /** The full pipeline must handle the edit; the micro path never hard-fails. */
  | { outcome: 'fallback'; reason: string };

type MicroEditModelOutput =
  | { intent: 'data' }
  | { intent: 'presentation'; patch: Record<string, unknown> };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cloneAsJson = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const parseMicroEditOutput = (responseText: string): MicroEditModelOutput => {
  const jsonMatches = Array.from(responseText.matchAll(INLINE_JSON_REGEX));
  const parsed: unknown = JSON.parse(
    jsonMatches.length > 0 ? jsonMatches[0][1].trim() : responseText
  );
  if (!isPlainObject(parsed)) {
    throw new Error('response is not a JSON object');
  }
  if (parsed.intent === 'data') {
    return { intent: 'data' };
  }
  if (parsed.intent === 'presentation') {
    if (!isPlainObject(parsed.patch)) {
      throw new Error("a presentation response must carry an object 'patch'");
    }
    return { intent: 'presentation', patch: parsed.patch };
  }
  throw new Error(`invalid intent: expected 'data' or 'presentation'`);
};

/** Maps the failing paths of a validation error to the fragments of the capabilities owning them. */
const fragmentsForValidationError = (
  chartType: SupportedChartType,
  errorMessage: string
): CapabilitySchemaFragment[] => {
  const names: string[] = [];
  for (const [, errorPath] of errorMessage.matchAll(VALIDATION_ERROR_PATH_REGEX)) {
    const name = capabilityForErrorPath(chartType, errorPath);
    if (name !== undefined && !names.includes(name)) {
      names.push(name);
    }
  }
  return getSchemaFragments(chartType, names) ?? [];
};

/**
 * Micro-resolver for presentation edits (decisions §5): one small-model call
 * classifies the edit instruction against the existing config and, when it is
 * presentation-only, returns a JSON Merge Patch (RFC 7386) that is applied
 * server-side and validated against the FULL chart schema — no ES|QL
 * regeneration, no full config generation.
 *
 * Safety rails: patches touching any data-capability path are treated as data
 * edits; the existing `data_source` is re-pinned after patching (the micro
 * path can never alter the ES|QL query); a validation failure gets ONE repair
 * retry (error + owning capability fragments) before falling back. Every
 * failure mode returns `fallback` — the micro path never hard-fails a request.
 */
export const tryMicroEdit = async ({
  nlQuery,
  chartType,
  existingConfig,
  modelProvider,
  logger,
}: MicroEditParams): Promise<MicroEditResult> => {
  const { schema, capabilities } = chartTypeRegistry[chartType];
  if (!capabilities) {
    return {
      outcome: 'fallback',
      reason: `chart type "${chartType}" has no capability manifest`,
    };
  }

  const dataCapabilityNames = Object.entries(capabilities)
    .filter(([, capability]) => capability.kind === 'data')
    .map(([name]) => name);
  const capabilityIndex = Object.entries(capabilities)
    .map(([name, { kind, blurb }]) => `${name} (${kind}) — ${blurb}`)
    .join('\n');

  try {
    // The classification + patch is a small task: use the cheaper model tier.
    const microModel = await modelProvider.selectModel({ effortLevel: EffortLevels.low });
    const existingConfigJson = JSON.stringify(existingConfig);
    let repair: MicroEditRepairContext | undefined;

    for (let attempt = 1; attempt <= MICRO_EDIT_MAX_ATTEMPTS; attempt++) {
      const response = await microModel.chatModel.invoke(
        createMicroEditPrompt({ nlQuery, chartType, existingConfigJson, capabilityIndex, repair })
      );

      let output: MicroEditModelOutput;
      try {
        output = parseMicroEditOutput(extractTextFromMessage(response));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.debug(
          `Micro-edit response invalid (attempt ${attempt}/${MICRO_EDIT_MAX_ATTEMPTS}): ${errorMessage}`
        );
        repair = { error: errorMessage, fragments: [] };
        continue;
      }

      if (output.intent === 'data') {
        return { outcome: 'fallback', reason: 'the model classified the edit as a data edit' };
      }

      const { patch } = output;
      const touchedDataCapabilities = dataCapabilityNames.filter((name) =>
        configUsesCapability(chartType, patch, name)
      );
      if (touchedDataCapabilities.length > 0) {
        return {
          outcome: 'fallback',
          reason: `the patch touches data capability paths (${touchedDataCapabilities.join(', ')})`,
        };
      }

      // Clone before re-pinning: applyMergePatch shares untouched subtrees
      // with the existing config by reference.
      const patchedConfig = cloneAsJson(applyMergePatch(existingConfig, patch));

      // Safety rail: the micro path must never alter the ES|QL query.
      const existingCarriers = getEsqlDataSourceCarriers(existingConfig);
      getEsqlDataSourceCarriers(patchedConfig).forEach((carrier, i) => {
        const dataSource = existingCarriers[i]?.data_source;
        if (dataSource !== undefined) {
          carrier.data_source = cloneAsJson(dataSource);
        }
      });

      try {
        const validatedConfig = schema.validate(patchedConfig);
        const esqlQuery =
          getEsqlDataSourceCarriers(validatedConfig).find(
            (carrier) => carrier.data_source?.type === 'esql' && carrier.data_source.query
          )?.data_source?.query ?? '';
        return { outcome: 'patched', validatedConfig, esqlQuery };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.debug(
          `Micro-edit patch failed validation (attempt ${attempt}/${MICRO_EDIT_MAX_ATTEMPTS}): ${errorMessage}`
        );
        repair = {
          patchJson: JSON.stringify(patch),
          error: errorMessage,
          fragments: fragmentsForValidationError(chartType, errorMessage),
        };
      }
    }

    return {
      outcome: 'fallback',
      reason: `no valid presentation patch after ${MICRO_EDIT_MAX_ATTEMPTS} attempts (last error: ${repair?.error})`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(`Micro-edit errored, falling back to the full pipeline: ${errorMessage}`);
    return { outcome: 'fallback', reason: errorMessage };
  }
};
