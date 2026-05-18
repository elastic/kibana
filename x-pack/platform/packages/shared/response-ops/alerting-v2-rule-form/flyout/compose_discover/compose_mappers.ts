/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dump, load } from 'js-yaml';
import { i18n } from '@kbn/i18n';
import { validateEsqlQuery } from '@kbn/alerting-v2-schemas';
import type { Query, RuleResponse, CreateRuleData, UpdateRuleData } from '@kbn/alerting-v2-schemas';
import { RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import { DELAY_MODE } from '../../form/types';
import {
  deriveAlertDelayModeFromStateTransition,
  deriveRecoveryDelayModeFromStateTransition,
} from '../../form/utils/rule_request_mappers';
import type { RuleQuery, ComposeFormValues, ComposeStateTransition } from './compose_form_types';

// ---------------------------------------------------------------------------
// Query adapters — thin because the API already speaks the right format.
// The compose form stores queries as RuleQuery (a local mirror of Query).
// ---------------------------------------------------------------------------

/** Converts the API's Query to the flyout's internal RuleQuery. Near-identity. */
export const transformQueryIn = (query: Query): RuleQuery => query as RuleQuery;

/** Converts the flyout's internal RuleQuery to the API's Query type. Near-identity. */
export const transformQueryOut = (ruleQuery: RuleQuery): Query => ruleQuery as Query;

// ---------------------------------------------------------------------------
// ComposeFormValues → API request
// ---------------------------------------------------------------------------

const createRunbookArtifactId = () =>
  `runbook-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

type ArtifactPayload = Array<{ id: string; type: string; value: string }>;

const mapArtifacts = (artifacts: ComposeFormValues['artifacts']): ArtifactPayload | undefined => {
  const current = artifacts ?? [];
  const runbook = current.find((a) => a.type === RUNBOOK_ARTIFACT_TYPE);
  const runbookValue = runbook?.value.trim();

  if (runbook && !runbookValue) {
    const rest = current.filter((a) => a.type !== RUNBOOK_ARTIFACT_TYPE);
    return rest.length ? rest : undefined;
  }

  if (runbook && runbookValue) {
    const id = runbook.id.trim() ? runbook.id : createRunbookArtifactId();
    if (runbook.value === runbookValue && runbook.id === id) {
      return current.length ? current : undefined;
    }
    return current.map((a) =>
      a.type === RUNBOOK_ARTIFACT_TYPE ? { ...a, id, value: runbookValue } : a
    );
  }

  return current.length ? current : undefined;
};

const mapStateTransition = (formValues: ComposeFormValues) => {
  if (formValues.kind !== 'alert') return undefined;

  const { stateTransition } = formValues;
  const alertMode =
    formValues.stateTransitionAlertDelayMode ??
    deriveAlertDelayModeFromStateTransition(stateTransition);
  const recoveryMode =
    formValues.stateTransitionRecoveryDelayMode ??
    deriveRecoveryDelayModeFromStateTransition(stateTransition);

  const out: {
    pending_count?: number;
    pending_timeframe?: string;
    recovering_count?: number;
    recovering_timeframe?: string;
  } = {};

  if (alertMode === DELAY_MODE.immediate) {
    out.pending_count = 0;
  } else if (alertMode === DELAY_MODE.breaches && stateTransition?.pendingCount != null) {
    out.pending_count = stateTransition.pendingCount;
  } else if (alertMode === DELAY_MODE.duration) {
    if (stateTransition?.pendingTimeframe != null)
      out.pending_timeframe = stateTransition.pendingTimeframe;
    if (stateTransition?.pendingCount != null) out.pending_count = stateTransition.pendingCount;
  }

  if (recoveryMode === DELAY_MODE.immediate) {
    out.recovering_count = 0;
  } else if (recoveryMode !== DELAY_MODE.duration && stateTransition?.recoveringCount != null) {
    out.recovering_count = stateTransition.recoveringCount;
  } else if (recoveryMode === DELAY_MODE.duration) {
    if (stateTransition?.recoveringTimeframe != null)
      out.recovering_timeframe = stateTransition.recoveringTimeframe;
    if (stateTransition?.recoveringCount != null)
      out.recovering_count = stateTransition.recoveringCount;
  }

  return Object.keys(out).length ? out : undefined;
};

const mapCommonRequest = (formValues: ComposeFormValues) => {
  const { metadata, timeField, schedule, query, grouping, artifacts } = formValues;
  const mappedArtifacts = mapArtifacts(artifacts);

  return {
    metadata: {
      name: metadata.name,
      description: metadata.description,
      owner: metadata.owner,
      ...(metadata.tags?.length ? { tags: metadata.tags } : {}),
    },
    time_field: timeField,
    schedule: { every: schedule.every, lookback: schedule.lookback },
    query: transformQueryOut(query),
    grouping: grouping?.fields?.length ? { fields: grouping.fields } : undefined,
    state_transition: mapStateTransition(formValues),
    ...(mappedArtifacts ? { artifacts: mappedArtifacts } : {}),
  };
};

export const composeFormToCreateRequest = (formValues: ComposeFormValues): CreateRuleData => ({
  kind: formValues.kind,
  ...mapCommonRequest(formValues),
});

export const composeFormToUpdateRequest = (formValues: ComposeFormValues): UpdateRuleData => {
  const { grouping, state_transition, artifacts, ...rest } = mapCommonRequest(formValues);
  return {
    ...rest,
    grouping: grouping ?? null,
    state_transition: state_transition ?? null,
    artifacts: artifacts ?? null,
  };
};

// ---------------------------------------------------------------------------
// API response → ComposeFormValues
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// YAML serialization / deserialization for ComposeFormValues
// ---------------------------------------------------------------------------

export interface ComposeYamlParseResult {
  values: ComposeFormValues | null;
  error: string | null;
}

interface YamlStateTransition {
  pending_count?: number;
  pending_timeframe?: string;
  recovering_count?: number;
  recovering_timeframe?: string;
}

const serializeStateTransition = (st?: ComposeStateTransition): YamlStateTransition | undefined => {
  if (!st) return undefined;
  const out: YamlStateTransition = {};
  if (st.pendingCount != null) out.pending_count = st.pendingCount;
  if (st.pendingTimeframe != null) out.pending_timeframe = st.pendingTimeframe;
  if (st.recoveringCount != null) out.recovering_count = st.recoveringCount;
  if (st.recoveringTimeframe != null) out.recovering_timeframe = st.recoveringTimeframe;
  return Object.keys(out).length ? out : undefined;
};

const parseArtifacts = (artifacts: unknown): ComposeFormValues['artifacts'] => {
  if (!Array.isArray(artifacts)) return undefined;
  const result = artifacts.flatMap((a) => {
    if (!a || typeof a !== 'object' || Array.isArray(a)) return [];
    const { id, type, value } = a as Record<string, unknown>;
    if (typeof id !== 'string' || typeof type !== 'string' || typeof value !== 'string') return [];
    return [{ id, type, value }];
  });
  return result.length ? result : undefined;
};

export const serializeComposeFormToYaml = (values: ComposeFormValues): string => {
  const st = serializeStateTransition(values.stateTransition);
  const obj = {
    kind: values.kind,
    metadata: {
      name: values.metadata.name,
      ...(values.metadata.description && { description: values.metadata.description }),
      ...(values.metadata.owner && { owner: values.metadata.owner }),
      ...(values.metadata.tags?.length && { tags: values.metadata.tags }),
    },
    time_field: values.timeField,
    schedule: { every: values.schedule.every, lookback: values.schedule.lookback },
    query: values.query,
    ...(values.grouping?.fields?.length && { grouping: { fields: values.grouping.fields } }),
    ...(st && { state_transition: st }),
    ...(values.artifacts?.length && { artifacts: values.artifacts }),
  };
  return dump(obj, { lineWidth: 120, noRefs: true });
};

export const parseYamlToComposeFormValues = (yamlString: string): ComposeYamlParseResult => {
  let parsed: unknown;
  try {
    parsed = load(yamlString);
  } catch {
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
  const stateTransition: ComposeStateTransition | undefined = stateTransitionObj
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
  if (typeof name !== 'string' || !name.trim()) {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.nameRequiredError', {
        defaultMessage: 'metadata.name is required.',
      }),
    };
  }

  // Validate the breach query present in the query object
  const format = queryObj?.format;
  let breachQuery: string | undefined;
  if (format === 'standalone') {
    breachQuery = typeof queryObj?.breach === 'string' ? queryObj.breach : undefined;
  } else if (format === 'composed') {
    const blocks = queryObj?.blocks as Record<string, unknown> | undefined;
    breachQuery = typeof blocks?.breach === 'string' ? blocks.breach : undefined;
  }

  if (!breachQuery?.trim()) {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.queryRequiredError', {
        defaultMessage: 'query.breach (or query.blocks.breach) is required.',
      }),
    };
  }

  const queryValidationError = validateEsqlQuery(breachQuery);
  if (queryValidationError) {
    return { values: null, error: queryValidationError };
  }

  let query: RuleQuery;
  if (format === 'composed') {
    const blocks = queryObj?.blocks as Record<string, unknown>;
    query = {
      format: 'composed',
      base: typeof queryObj?.base === 'string' ? queryObj.base : '',
      blocks: {
        breach: breachQuery,
        ...(typeof blocks?.recover === 'string' && blocks.recover
          ? { recover: blocks.recover }
          : {}),
      },
    };
  } else {
    const recover =
      typeof queryObj?.recover === 'string' && queryObj.recover ? queryObj.recover : undefined;
    query = { format: 'standalone', breach: breachQuery, ...(recover ? { recover } : {}) };
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
      query,
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

export const mapRuleToComposeFormValues = (rule: RuleResponse): Partial<ComposeFormValues> => {
  const stateTransition: ComposeStateTransition = {
    pendingCount: rule.state_transition?.pending_count ?? null,
    pendingTimeframe: rule.state_transition?.pending_timeframe ?? null,
    recoveringCount: rule.state_transition?.recovering_count ?? null,
    recoveringTimeframe: rule.state_transition?.recovering_timeframe ?? null,
  };

  return {
    kind: rule.kind,
    metadata: {
      name: rule.metadata.name,
      description: rule.metadata.description,
      enabled: rule.enabled,
      owner: rule.metadata.owner,
      tags: rule.metadata.tags,
    },
    timeField: rule.time_field,
    schedule: {
      every: rule.schedule.every,
      lookback: rule.schedule.lookback ?? '1m',
    },
    query: transformQueryIn(rule.query),
    ...(rule.grouping ? { grouping: { fields: rule.grouping.fields } } : {}),
    stateTransition,
    stateTransitionAlertDelayMode: deriveAlertDelayModeFromStateTransition(stateTransition),
    stateTransitionRecoveryDelayMode: deriveRecoveryDelayModeFromStateTransition(stateTransition),
    ...(rule.artifacts ? { artifacts: rule.artifacts } : {}),
  };
};
