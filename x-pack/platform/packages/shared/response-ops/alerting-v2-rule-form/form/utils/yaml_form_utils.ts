/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { dump, load } from 'js-yaml';
import type { FormValues, StateTransition, RuleQuery } from '../types';
import {
  deriveAlertDelayModeFromStateTransition,
  deriveRecoveryDelayModeFromStateTransition,
} from '../types';
import { splitArtifactsByType } from './artifact_mappers';
import { mapFormValuesToCreateRequest } from './rule_request_mappers';

export type YamlParseResult = { values: FormValues; error: null } | { values: null; error: string };

const parseArtifacts = (artifacts: unknown): FormValues['artifacts'] => {
  if (!Array.isArray(artifacts)) return undefined;

  const parsedArtifacts = artifacts.flatMap((artifact) => {
    if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) {
      return [];
    }

    const { id, type, value } = artifact as Record<string, unknown>;
    if (typeof id !== 'string' || typeof type !== 'string' || typeof value !== 'string') {
      return [];
    }

    return [{ id, type, value }];
  });

  return parsedArtifacts.length ? parsedArtifacts : undefined;
};

/**
 * Strip undefined/null values from an object tree so js-yaml produces clean output.
 */
const stripEmpty = (obj: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      const cleaned = stripEmpty(value as Record<string, unknown>);
      if (Object.keys(cleaned).length) result[key] = cleaned;
    } else {
      result[key] = value;
    }
  }
  return result;
};

/**
 * Convert FormValues to a YAML-compatible object by reusing the shared
 * create-request mapper, then stripping undefined/null values so the
 * YAML output stays clean (no `description: null` noise).
 */
export const formValuesToYamlObject = (values: FormValues): Record<string, unknown> =>
  stripEmpty(mapFormValuesToCreateRequest(values) as unknown as Record<string, unknown>);

/**
 * Lenient extractor for a nested `{ query: string }` or `{ segment: string }` block.
 * Also accepts a bare string for backward compatibility with hand-written YAML.
 */
const extractNestedString = (value: unknown, key: 'query' | 'segment'): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const nested = (value as Record<string, unknown>)[key];
    if (typeof nested === 'string') return nested;
  }
  return '';
};

const parseQuery = (queryObj: Record<string, unknown> | undefined): RuleQuery => {
  if (!queryObj) {
    return { format: 'standalone', breach: { query: '' } };
  }

  const format = queryObj.format;

  if (format === 'composed') {
    const base = typeof queryObj.base === 'string' ? queryObj.base : '';
    const breachSegment = extractNestedString(queryObj.breach, 'segment');
    const recoverySegment = extractNestedString(queryObj.recovery, 'segment');
    return {
      format: 'composed',
      base,
      breach: { segment: breachSegment },
      ...(recoverySegment ? { recovery: { segment: recoverySegment } } : {}),
    };
  }

  const breachQuery = extractNestedString(queryObj.breach, 'query');
  const recoveryQuery = extractNestedString(queryObj.recovery, 'query');
  const noDataQuery = extractNestedString(queryObj.no_data, 'query');
  return {
    format: 'standalone',
    breach: { query: breachQuery },
    ...(recoveryQuery ? { recovery: { query: recoveryQuery } } : {}),
    ...(noDataQuery ? { no_data: { query: noDataQuery } } : {}),
  };
};

/**
 * Parse YAML string to FormValues (lenient).
 *
 * Parses the YAML structure and extracts all recognised fields, providing
 * safe defaults for any that are missing. YAML syntax errors are still
 * reported. Field-level validation (required name, valid ES|QL, etc.)
 * is handled by RHF at submit time, keeping a single validation pipeline.
 */
export const parseYamlToFormValues = (yamlString: string): YamlParseResult => {
  let parsed: unknown;
  try {
    parsed = load(yamlString);
  } catch (error) {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.yamlSyntaxError', {
        defaultMessage: 'Invalid YAML syntax.',
      }),
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.yamlObjectError', {
        defaultMessage: 'YAML must be an object.',
      }),
    };
  }

  const obj = parsed as Record<string, unknown>;
  const metadata = obj.metadata as Record<string, unknown> | undefined;
  const schedule = obj.schedule as Record<string, unknown> | undefined;
  const queryObj = obj.query as Record<string, unknown> | undefined;
  const grouping = obj.grouping as Record<string, unknown> | undefined;
  const parsedArtifacts = parseArtifacts(obj.artifacts);
  const artifactSlices = splitArtifactsByType(parsedArtifacts);
  const stateTransitionObj = obj.state_transition as Record<string, unknown> | undefined;
  const stateTransition: StateTransition | undefined = stateTransitionObj
    ? {
        pendingCount:
          typeof stateTransitionObj.pending_count === 'number'
            ? stateTransitionObj.pending_count
            : null,
        pendingTimeframe:
          typeof stateTransitionObj.pending_timeframe === 'string'
            ? stateTransitionObj.pending_timeframe
            : null,
        recoveringCount:
          typeof stateTransitionObj.recovering_count === 'number'
            ? stateTransitionObj.recovering_count
            : null,
        recoveringTimeframe:
          typeof stateTransitionObj.recovering_timeframe === 'string'
            ? stateTransitionObj.recovering_timeframe
            : null,
      }
    : undefined;

  const kind = obj.kind;
  if (kind !== undefined && kind !== 'alert' && kind !== 'signal') {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.invalidKindError', {
        defaultMessage: 'Kind must be "alert" or "signal".',
      }),
    };
  }

  const name = metadata?.name;

  return {
    values: {
      kind: (kind as 'alert' | 'signal') ?? 'alert',
      metadata: {
        name: typeof name === 'string' ? name.trim() : '',
        enabled: metadata?.enabled !== false,
        description: typeof metadata?.description === 'string' ? metadata.description : undefined,
        owner: typeof metadata?.owner === 'string' ? metadata.owner : undefined,
        tags: Array.isArray(metadata?.tags) ? (metadata.tags as string[]) : undefined,
      },
      timeField: typeof obj.time_field === 'string' ? obj.time_field : '@timestamp',
      schedule: {
        every: typeof schedule?.every === 'string' ? schedule.every : '5m',
        lookback: typeof schedule?.lookback === 'string' ? schedule.lookback : '1m',
      },
      query: parseQuery(queryObj),
      grouping: Array.isArray(grouping?.fields)
        ? { fields: grouping.fields as string[] }
        : undefined,
      ...artifactSlices,
      stateTransition,
      stateTransitionAlertDelayMode: deriveAlertDelayModeFromStateTransition(stateTransition),
      stateTransitionRecoveryDelayMode: deriveRecoveryDelayModeFromStateTransition(stateTransition),
    },
    error: null,
  };
};

/**
 * Serialize current form values to YAML string
 */
export const serializeFormToYaml = (values: FormValues): string => {
  return dump(formValuesToYamlObject(values), { lineWidth: 120, noRefs: true });
};
