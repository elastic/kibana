/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { dump, load } from 'js-yaml';
import type { FormValues, StateTransition } from '../types';
import {
  deriveAlertDelayModeFromStateTransition,
  deriveRecoveryDelayModeFromStateTransition,
} from './rule_request_mappers';

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

interface YamlStateTransition {
  pending_count?: number;
  pending_timeframe?: string;
  recovering_count?: number;
  recovering_timeframe?: string;
}

interface YamlQuery {
  format: 'standalone';
  breach: { query: string };
}

interface YamlRuleObject {
  kind: string;
  metadata: { name: string; description?: string; owner?: string; tags?: string[] };
  time_field: string;
  schedule: { every: string; lookback: string };
  query: YamlQuery;
  grouping?: { fields: string[] };
  state_transition?: YamlStateTransition;
  artifacts?: Array<{ id: string; type: string; value: string }>;
}

/**
 * Lenient extractor for the YAML `query.breach` field. Accepts the canonical
 * nested object (`{ query: '…' }`) as well as legacy/handwritten strings so
 * that pasting an older payload doesn't blow up the parser.
 */
const extractBreachQuery = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const { query } = value as { query?: unknown };
    if (typeof query === 'string') return query;
  }
  return '';
};

const serializeStateTransition = (st?: StateTransition): YamlStateTransition | undefined => {
  if (!st) return undefined;
  const out: YamlStateTransition = {};
  if (st.pendingCount != null) out.pending_count = st.pendingCount;
  if (st.pendingTimeframe != null) out.pending_timeframe = st.pendingTimeframe;
  if (st.recoveringCount != null) out.recovering_count = st.recoveringCount;
  if (st.recoveringTimeframe != null) out.recovering_timeframe = st.recoveringTimeframe;
  return Object.keys(out).length ? out : undefined;
};

/**
 * Convert FormValues to YAML-compatible object (snake_case keys for API compatibility).
 *
 * Note: `metadata.enabled` is intentionally NOT serialized. The API's `metadataSchema`
 * is strict and only accepts { name, description?, owner?, tags? }; `enabled` lives at
 * the top level of the update/response schemas, never under metadata, and is not part
 * of the create payload at all. The form keeps its own `metadata.enabled` for the
 * Enabled toggle UI; that's stripped by the request mappers before the API call.
 */
export const formValuesToYamlObject = (values: FormValues): YamlRuleObject => {
  const st = serializeStateTransition(values.stateTransition);

  return {
    kind: values.kind,
    metadata: {
      name: values.metadata.name,
      ...(values.metadata.description && { description: values.metadata.description }),
      ...(values.metadata.owner && { owner: values.metadata.owner }),
      ...(values.metadata.tags?.length && { tags: values.metadata.tags }),
    },
    time_field: values.timeField,
    schedule: {
      every: values.schedule.every,
      lookback: values.schedule.lookback,
    },
    query: {
      format: 'standalone',
      breach: { query: values.query.breach },
    },
    ...(values.grouping?.fields?.length && { grouping: { fields: values.grouping.fields } }),
    ...(st && { state_transition: st }),
    ...(values.artifacts?.length && { artifacts: values.artifacts }),
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
  const artifacts = parseArtifacts(obj.artifacts);
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

  // Validate kind
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
      query: {
        breach: extractBreachQuery(queryObj?.breach),
      },
      grouping: Array.isArray(grouping?.fields)
        ? { fields: grouping.fields as string[] }
        : undefined,
      artifacts,
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
