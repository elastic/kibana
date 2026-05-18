/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { dump, load } from 'js-yaml';
import { validateEsqlQuery } from '@kbn/alerting-v2-schemas';
import type { FormValues, RecoveryPolicy, StateTransition } from '../types';
import {
  deriveAlertDelayModeFromStateTransition,
  deriveRecoveryDelayModeFromStateTransition,
} from './rule_request_mappers';

export interface YamlParseResult {
  values: FormValues | null;
  error: string | null;
}

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

interface YamlRecoveryPolicy {
  type: string;
  query?: { base: string };
}

interface YamlRuleObject {
  kind: string;
  metadata: { name: string; description?: string; owner?: string; tags?: string[] };
  time_field: string;
  schedule: { every: string; lookback: string };
  evaluation: { query: { base: string } };
  grouping?: { fields: string[] };
  state_transition?: YamlStateTransition;
  recovery_policy?: YamlRecoveryPolicy;
  artifacts?: Array<{ id: string; type: string; value: string }>;
}

const serializeStateTransition = (st?: StateTransition): YamlStateTransition | undefined => {
  if (!st) return undefined;
  const out: YamlStateTransition = {};
  if (st.pendingCount != null) out.pending_count = st.pendingCount;
  if (st.pendingTimeframe != null) out.pending_timeframe = st.pendingTimeframe;
  if (st.recoveringCount != null) out.recovering_count = st.recoveringCount;
  if (st.recoveringTimeframe != null) out.recovering_timeframe = st.recoveringTimeframe;
  return Object.keys(out).length ? out : undefined;
};

const serializeRecoveryPolicy = (rp?: RecoveryPolicy): YamlRecoveryPolicy | undefined => {
  if (!rp) return undefined;
  const out: YamlRecoveryPolicy = { type: rp.type };
  if (rp.type === 'query' && rp.query?.base) {
    out.query = { base: rp.query.base };
  }
  return out;
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
  const rp = serializeRecoveryPolicy(values.recoveryPolicy);

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
    evaluation: {
      query: {
        base: values.evaluation.query.base,
      },
    },
    ...(values.grouping?.fields?.length && { grouping: { fields: values.grouping.fields } }),
    ...(st && { state_transition: st }),
    ...(rp && { recovery_policy: rp }),
    ...(values.artifacts?.length && { artifacts: values.artifacts }),
  };
};

/**
 * Parse and validate YAML string to FormValues
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
  const evaluation = obj.evaluation as Record<string, unknown> | undefined;
  const evalQuery = evaluation?.query as Record<string, unknown> | undefined;
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

  const recoveryPolicyObj = obj.recovery_policy as Record<string, unknown> | undefined;
  const recoveryPolicy: RecoveryPolicy | undefined = recoveryPolicyObj
    ? {
        type:
          recoveryPolicyObj.type === 'query' || recoveryPolicyObj.type === 'no_breach'
            ? recoveryPolicyObj.type
            : 'no_breach',
        ...(recoveryPolicyObj.type === 'query' &&
        recoveryPolicyObj.query &&
        typeof recoveryPolicyObj.query === 'object'
          ? {
              query: {
                base:
                  typeof (recoveryPolicyObj.query as Record<string, unknown>).base === 'string'
                    ? ((recoveryPolicyObj.query as Record<string, unknown>).base as string)
                    : undefined,
              },
            }
          : {}),
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

  // Validate required fields
  const name = metadata?.name;
  if (typeof name !== 'string' || !name.trim()) {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.nameRequiredError', {
        defaultMessage: 'metadata.name is required.',
      }),
    };
  }

  const queryBase = evalQuery?.base;
  if (typeof queryBase !== 'string' || !queryBase.trim()) {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.queryRequiredError', {
        defaultMessage: 'evaluation.query.base is required.',
      }),
    };
  }

  // Validate ES|QL query syntax
  const queryValidationError = validateEsqlQuery(queryBase);
  if (queryValidationError) {
    return {
      values: null,
      error: queryValidationError,
    };
  }

  return {
    values: {
      kind: (kind as 'alert' | 'signal') ?? 'alert',
      metadata: {
        name: name.trim(),
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
      evaluation: {
        query: {
          base: queryBase,
        },
      },
      grouping: Array.isArray(grouping?.fields)
        ? { fields: grouping.fields as string[] }
        : undefined,
      artifacts,
      recoveryPolicy: recoveryPolicy ?? { type: 'no_breach' },
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
