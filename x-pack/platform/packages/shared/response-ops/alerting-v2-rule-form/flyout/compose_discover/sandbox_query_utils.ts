/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposedQuery, RuleQuery } from './compose_form_types';
import { getBreachQuery, getRecoverQuery } from './compose_form_types';
import type { QueryTab, RecoveryType } from './types';
import { splitQuery } from './use_heuristic_split';
import { getStepIds } from './use_compose_discover_state';

export interface AlertQuerySnapshot {
  query: ComposedQuery;
  manualSplitEnabled: boolean;
  fullQuery: string;
}

export function toUnifiedSandboxQuery(query: RuleQuery): RuleQuery {
  return {
    format: 'standalone',
    breach: { query: getBreachQuery(query) },
  };
}

export function toManualSplitQuery(fullQuery: string): ComposedQuery {
  const { base, alertBlock } = splitQuery(fullQuery.trim());
  return {
    format: 'composed',
    base,
    breach: { segment: alertBlock },
  };
}

export function ensureComposedQuery(query: RuleQuery): ComposedQuery {
  if (query.format === 'composed') {
    return query;
  }
  const composed = toManualSplitQuery(getBreachQuery(query));
  if (query.recovery?.query?.trim()) {
    return {
      ...composed,
      recovery: { segment: query.recovery.query },
    };
  }
  return composed;
}

/** YAML mode always edits base/alert in separate tabs; recovery tab appears when present. */
export function getYamlSandboxTabs(
  query: RuleQuery,
  recoveryType: RecoveryType
): QueryTab[] {
  const composed = ensureComposedQuery(query);
  const hasRecovery =
    recoveryType === 'custom' || Boolean(composed.recovery?.segment?.trim());
  return hasRecovery ? ['base', 'alert', 'recovery'] : ['base', 'alert'];
}

export function resolveSandboxQueryOnApply({
  sandboxQuery,
  committedQuery,
  useUnified,
}: {
  sandboxQuery: RuleQuery;
  committedQuery: RuleQuery;
  useUnified: boolean;
}): RuleQuery {
  if (useUnified && sandboxQuery.format === 'standalone') {
    return toManualSplitQuery(sandboxQuery.breach.query);
  }

  if (sandboxQuery.format === 'standalone' && committedQuery.format === 'composed') {
    return {
      ...committedQuery,
      ...(sandboxQuery.recovery?.query.trim()
        ? { recovery: { segment: sandboxQuery.recovery.query } }
        : {}),
    };
  }

  return sandboxQuery;
}

export function shouldUseUnifiedSandboxEditor(
  isAlert: boolean,
  step: number,
  yamlMode: boolean,
  isBuilderMode: boolean,
  manualSplitEnabled: boolean
): boolean {
  if (isBuilderMode || !isAlert || yamlMode || manualSplitEnabled) {
    return false;
  }
  return getStepIds(true)[step] === 'alertCondition';
}

export function shouldShowSignalQueryHeader(
  isAlert: boolean,
  step: number,
  isBuilderMode: boolean
): boolean {
  if (isBuilderMode || isAlert) {
    return false;
  }
  return getStepIds(false)[step] === 'alertCondition';
}

export function shouldShowManualSplitToggle(
  isAlert: boolean,
  step: number,
  yamlMode: boolean,
  isBuilderMode: boolean,
  manualSplitEnabled: boolean,
  queryCommitted: boolean
): boolean {
  if (isBuilderMode || !isAlert || yamlMode || !queryCommitted) {
    return false;
  }
  return getStepIds(true)[step] === 'alertCondition' && !manualSplitEnabled;
}

export function shouldShowRecoverySandboxHeader(
  isAlert: boolean,
  step: number,
  yamlMode: boolean,
  isBuilderMode: boolean,
  recoveryType: RecoveryType
): boolean {
  if (isBuilderMode || !isAlert || yamlMode) {
    return false;
  }
  return (
    getStepIds(true)[step] === 'recoveryCondition' && recoveryType === 'custom'
  );
}

/** YAML sandbox always edits explicit base/alert/recovery tabs for alert rules. */
export function shouldPreserveYamlSplitOnFormExit(
  isAlertKind: boolean,
  isBuilderMode: boolean,
  yamlSandboxQuery: RuleQuery
): boolean {
  return isAlertKind && !isBuilderMode && yamlSandboxQuery.format === 'composed';
}

/**
 * When leaving YAML mode, keep the sandbox's composed split instead of flattening
 * to standalone via YAML parse (which only stores the joined breach query).
 */
export function queryFromYamlToForm({
  parsedQuery,
  yamlSandboxQuery,
  isAlertKind,
  isBuilderMode,
}: {
  parsedQuery: RuleQuery;
  yamlSandboxQuery: RuleQuery;
  isAlertKind: boolean;
  isBuilderMode: boolean;
}): RuleQuery {
  if (shouldPreserveYamlSplitOnFormExit(isAlertKind, isBuilderMode, yamlSandboxQuery)) {
    return yamlSandboxQuery;
  }
  return parsedQuery;
}

/**
 * The unified (single) editor always edits the full breach pipeline. When the
 * sandbox still holds a composed query (e.g. after Apply), writing that full
 * text into `breach.segment` duplicates the base on the next join.
 */
export function ruleQueryFromUnifiedEditorChange(
  currentQuery: RuleQuery,
  fullQuery: string
): RuleQuery {
  const recovery =
    currentQuery.format === 'composed' && currentQuery.recovery?.segment?.trim()
      ? { query: getRecoverQuery(currentQuery) }
      : currentQuery.format === 'standalone' && currentQuery.recovery?.query?.trim()
        ? currentQuery.recovery
        : undefined;

  return {
    format: 'standalone',
    breach: { query: fullQuery },
    ...(recovery ? { recovery } : {}),
  };
}

