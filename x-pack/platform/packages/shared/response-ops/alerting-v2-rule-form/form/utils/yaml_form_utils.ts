/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isPlainObject } from 'lodash';
import type {
  NoData,
  Query,
  Recovery,
  StateTransition as ApiStateTransition,
} from '@kbn/alerting-v2-schemas';
import {
  noDataSchema,
  noDataStrategy,
  noDataStrategySchema,
  recoverySchema,
  recoveryStrategy,
  recoveryStrategySchema,
} from '@kbn/alerting-v2-schemas';
import { parse, stringify } from 'yaml';
import type { FormValues, StateTransition, RuleQuery, RuleNoData, RuleRecovery } from '../types';
import {
  deriveAlertDelayModeFromStateTransition,
  deriveRecoveryDelayModeFromStateTransition,
} from './state_transition_helpers';
import { ruleQueryToApiQuery } from './query_mappers';
import {
  apiNoDataToFormNoData,
  apiRecoveryToFormRecovery,
  formNoDataToApiNoData,
  formRecoveryToApiRecovery,
} from './lifecycle_mappers';
import { mergeArtifactsByType, splitArtifactsByType } from './artifact_mappers';

export type YamlParseResult = { values: FormValues; error: null } | { values: null; error: string };

const parseArtifacts = (artifacts: unknown): FormValues['artifacts'] => {
  if (!Array.isArray(artifacts)) return undefined;

  const parsedArtifacts = artifacts.flatMap((artifact) => {
    if (!isPlainObject(artifact)) {
      return [];
    }

    const { id, type, data } = artifact as Record<string, unknown>;
    if (typeof id !== 'string' || typeof type !== 'string' || !isPlainObject(data)) {
      return [];
    }

    return [{ id, type, data: data as Record<string, any> }];
  });

  return parsedArtifacts.length ? parsedArtifacts : undefined;
};

interface YamlRuleObject {
  kind: string;
  metadata: { name: string; description?: string; owner?: string; tags?: string[] };
  time_field: string;
  schedule: { every: string; lookback: string };
  query: Query;
  recovery?: Recovery;
  no_data?: NoData;
  grouping?: { fields: string[] };
  state_transition?: ApiStateTransition;
  artifacts?: Array<{ id: string; type: string; data: Record<string, any> }>;
}

const serializeStateTransition = (st?: StateTransition): ApiStateTransition | undefined => {
  if (!st) return undefined;
  const pending = {
    ...(st.pendingCount != null ? { count: st.pendingCount } : {}),
    ...(st.pendingTimeframe != null ? { timeframe: st.pendingTimeframe } : {}),
  };
  const recovering = {
    ...(st.recoveringCount != null ? { count: st.recoveringCount } : {}),
    ...(st.recoveringTimeframe != null ? { timeframe: st.recoveringTimeframe } : {}),
  };
  const out: ApiStateTransition = {
    ...(Object.keys(pending).length ? { pending } : {}),
    ...(Object.keys(recovering).length ? { recovering } : {}),
  };
  return Object.keys(out).length ? out : undefined;
};

/**
 * Convert FormValues to YAML-compatible object (snake_case keys for API compatibility).
 *
 * Note: `metadata.enabled` is intentionally NOT serialized. The API's `metadataSchema`
 * is strict and only accepts { name, description?, owner?, tags? }; `enabled` lives at
 * the top level of the update/response schemas, never under metadata, and is not part
 * of the create payload at all.
 */
export const formValuesToYamlObject = (values: FormValues): YamlRuleObject => {
  const st = serializeStateTransition(values.stateTransition);
  const allArtifacts = mergeArtifactsByType(values);
  const recovery = formRecoveryToApiRecovery(values);
  const noData = formNoDataToApiNoData(values);

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
    query: ruleQueryToApiQuery(values.query),
    ...(recovery ? { recovery } : {}),
    ...(noData ? { no_data: noData } : {}),
    ...(values.grouping?.fields?.length && { grouping: { fields: values.grouping.fields } }),
    ...(values.kind === 'alert' && st ? { state_transition: st } : {}),
    ...(allArtifacts?.length && { artifacts: allArtifacts }),
  };
};

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

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const asOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asOptionalNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

const invalidQueryField = (field: string): string =>
  i18n.translate('xpack.alertingV2.yamlRuleForm.invalidQueryFieldError', {
    defaultMessage: 'Invalid query field: {field}.',
    values: { field },
  });

/**
 * A missing field is left to RHF to report, but an unsupported one is not: a
 * misspelt `breach` reads as "no breach condition" and would save a rule that
 * breaches on every row of `base`.
 */
const findQueryFieldError = (value: unknown): string | undefined => {
  if (value == null) return undefined;

  const queryObj = asRecord(value);
  if (!queryObj) return invalidQueryField('query');

  const unsupportedKey = Object.keys(queryObj).find((key) => key !== 'base' && key !== 'breach');
  if (unsupportedKey) return invalidQueryField(unsupportedKey);
  if (queryObj.base != null && typeof queryObj.base !== 'string') return invalidQueryField('base');

  const { breach } = queryObj;
  if (breach == null || typeof breach === 'string') return undefined;

  const breachObj = asRecord(breach);
  if (!breachObj) return invalidQueryField('breach');

  const unsupportedBreachKey = Object.keys(breachObj).find((key) => key !== 'segment');
  if (unsupportedBreachKey) return invalidQueryField(`breach.${unsupportedBreachKey}`);
  if (breachObj.segment != null && typeof breachObj.segment !== 'string') {
    return invalidQueryField('breach.segment');
  }

  return undefined;
};

const parseQuery = (queryObj: Record<string, unknown> | undefined): RuleQuery => ({
  base: asOptionalString(queryObj?.base) ?? '',
  breach: { segment: extractNestedString(queryObj?.breach, 'segment') },
});

const ALERT_ONLY_KEYS = ['recovery', 'no_data', 'state_transition'] as const;

/*
 * Both blocks are parsed with the write schema rather than the strategy alone.
 * The form state is widened across strategies so a user can switch between them
 * without losing what they typed, but a field the chosen strategy does not
 * accept would be dropped on save, leaving the editor showing something the
 * rule does not do.
 */
const parseRecovery = (value: unknown): RuleRecovery | undefined => {
  const parsed = recoverySchema.safeParse(value);
  return parsed.success ? apiRecoveryToFormRecovery(parsed.data) : undefined;
};

const parseNoData = (value: unknown): RuleNoData | undefined => {
  const parsed = noDataSchema.safeParse(value);
  return parsed.success ? apiNoDataToFormNoData(parsed.data) : undefined;
};

const parseStateTransition = (value: unknown): StateTransition | undefined => {
  const stateTransitionObj = asRecord(value);
  if (!stateTransitionObj) return undefined;
  const pending = asRecord(stateTransitionObj.pending);
  const recovering = asRecord(stateTransitionObj.recovering);
  return {
    pendingCount: asOptionalNumber(pending?.count) ?? null,
    pendingTimeframe: asOptionalString(pending?.timeframe) ?? null,
    recoveringCount: asOptionalNumber(recovering?.count) ?? null,
    recoveringTimeframe: asOptionalString(recovering?.timeframe) ?? null,
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
    parsed = parse(yamlString);
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
  const stateTransition = parseStateTransition(obj.state_transition);

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
  const resolvedKind = (kind as 'alert' | 'signal') ?? 'alert';
  const isAlert = resolvedKind === 'alert';

  const queryFieldError = findQueryFieldError(obj.query);
  if (queryFieldError) {
    return { values: null, error: queryFieldError };
  }

  // The request mappers drop these for signals, so accepting them here would
  // save a rule that silently differs from the YAML in front of the user.
  const alertOnlyBlocks = ALERT_ONLY_KEYS.filter((key) => obj[key] != null);
  if (!isAlert && alertOnlyBlocks.length > 0) {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.signalAlertOnlyFieldsError', {
        defaultMessage: 'Signal rules cannot set {fields}.',
        values: { fields: alertOnlyBlocks.join(', ') },
      }),
    };
  }

  const parsedRecovery = parseRecovery(obj.recovery);
  if (obj.recovery !== undefined && parsedRecovery === undefined) {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.invalidRecoveryError', {
        defaultMessage:
          'Invalid recovery. Set strategy to one of {strategies}, with the fields that strategy accepts.',
        values: { strategies: recoveryStrategySchema.options.join(', ') },
      }),
    };
  }

  const parsedNoData = parseNoData(obj.no_data);
  if (obj.no_data !== undefined && parsedNoData === undefined) {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.invalidNoDataError', {
        defaultMessage:
          'Invalid no_data. Set strategy to one of {strategies}, with the fields that strategy accepts.',
        values: { strategies: noDataStrategySchema.options.join(', ') },
      }),
    };
  }

  // Alert rules always carry both blocks and the write API defaults neither,
  // so an omitted block is filled in here before the form can submit it.
  const recovery =
    parsedRecovery ?? (isAlert ? { strategy: recoveryStrategy.no_breach } : undefined);
  const noData = parsedNoData ?? (isAlert ? { strategy: noDataStrategy.ignore } : undefined);

  return {
    values: {
      kind: resolvedKind,
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
      recovery,
      noData,
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
 *
 * `singleQuote` keeps scalars that need quoting in the single-quoted style users
 * already see in the editor (e.g. `time_field: '@timestamp'`), and
 * `aliasDuplicateObjects: false` inlines repeated objects rather than emitting
 * anchors/aliases, which are undesirable in hand-editable rule YAML.
 */
export const serializeFormToYaml = (values: FormValues): string => {
  return stringify(formValuesToYamlObject(values), {
    lineWidth: 120,
    singleQuote: true,
    aliasDuplicateObjects: false,
  });
};
