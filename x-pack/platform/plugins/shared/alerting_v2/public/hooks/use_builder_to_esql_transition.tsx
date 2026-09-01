/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuilderState, ComposeDiscoverMode } from '@kbn/alerting-v2-rule-form';
import { RULE_BUILDER_REGISTRY, fromBuilderFields } from '@kbn/alerting-v2-rule-form';
import { getBreachEsqlQuery, getRecoverEsqlQuery } from '@kbn/alerting-v2-schemas';
import React, { useCallback, useState } from 'react';
import type { RuleApiResponse } from '../services/rules_api';
import {
  ConfirmBuilderToEsqlModal,
  CONFIRM_BUILDER_TO_ESQL_VARIANT,
} from '../components/confirm_builder_to_esql_modal';

/**
 * Legacy path: reconstructs builder form state by parsing the ES|QL query text.
 * Only used for rules saved before `metadata.builder_fields` existed.
 */
const tryParseBuilderState = (
  type: string,
  query: string,
  recoveryQuery?: string
): BuilderState | null => {
  const definition = RULE_BUILDER_REGISTRY[type];
  if (definition?.parseState) {
    return definition.parseState(query, recoveryQuery);
  }
  return null;
};

/**
 * Recovers the builder form state for a saved rule.
 *
 * Rules written since `metadata.builder_fields` was introduced carry the
 * parameters they were authored with, so they reopen exactly as configured.
 * Older rules only have the compiled query, which the builder may be able to
 * parse back — a best-effort path that fails for a query since hand-edited.
 */
const recoverBuilderState = (rule: RuleApiResponse, builderType: string): BuilderState | null => {
  const fromFields = fromBuilderFields(builderType, rule.metadata.builder_fields);
  if (fromFields !== undefined) {
    return fromFields;
  }

  const query = rule.query ? getBreachEsqlQuery(rule.query) : '';
  if (!query) {
    return null;
  }

  return tryParseBuilderState(
    builderType,
    query,
    getRecoverEsqlQuery(rule.query, rule.recovery_strategy)
  );
};

interface UseBuilderToEsqlTransitionOptions {
  onConfirmEsqlFallback: (rule: RuleApiResponse, mode: ComposeDiscoverMode) => void;
  onConfirmSwitch: () => void;
}

interface ResolvedBuilderMode {
  builderType: string;
  initialBuilderState: BuilderState;
}

export const useBuilderToEsqlTransition = ({
  onConfirmEsqlFallback,
  onConfirmSwitch,
}: UseBuilderToEsqlTransitionOptions) => {
  const [pendingEsqlFallback, setPendingEsqlFallback] = useState<{
    rule: RuleApiResponse;
    mode: ComposeDiscoverMode;
  } | null>(null);
  const [showSwitchConfirmation, setShowSwitchConfirmation] = useState(false);

  const resolveBuilderMode = useCallback(
    (rule: RuleApiResponse): ResolvedBuilderMode | 'esql-fallback' | 'esql' => {
      if (!rule.metadata.builder_type) {
        return 'esql';
      }
      const state = recoverBuilderState(rule, rule.metadata.builder_type);
      if (state && typeof state === 'object') {
        return {
          builderType: rule.metadata.builder_type,
          initialBuilderState: { ...state, timeField: rule.time_field ?? '@timestamp' },
        };
      }
      return 'esql-fallback';
    },
    []
  );

  const requestEsqlFallback = useCallback((rule: RuleApiResponse, mode: ComposeDiscoverMode) => {
    setPendingEsqlFallback({ rule, mode });
  }, []);

  const confirmEsqlFallback = useCallback(() => {
    if (!pendingEsqlFallback) return;
    const { rule, mode } = pendingEsqlFallback;
    setPendingEsqlFallback(null);
    onConfirmEsqlFallback(rule, mode);
  }, [pendingEsqlFallback, onConfirmEsqlFallback]);

  const cancelEsqlFallback = useCallback(() => {
    setPendingEsqlFallback(null);
  }, []);

  const requestSwitchToEsql = useCallback(() => {
    setShowSwitchConfirmation(true);
  }, []);

  const confirmSwitchToEsql = useCallback(() => {
    setShowSwitchConfirmation(false);
    onConfirmSwitch();
  }, [onConfirmSwitch]);

  const cancelSwitchToEsql = useCallback(() => {
    setShowSwitchConfirmation(false);
  }, []);

  const confirmationModal = pendingEsqlFallback ? (
    <ConfirmBuilderToEsqlModal
      variant={CONFIRM_BUILDER_TO_ESQL_VARIANT.INCOMPATIBLE_QUERY}
      onConfirm={confirmEsqlFallback}
      onCancel={cancelEsqlFallback}
    />
  ) : showSwitchConfirmation ? (
    <ConfirmBuilderToEsqlModal
      variant={CONFIRM_BUILDER_TO_ESQL_VARIANT.USER_INITIATED}
      onConfirm={confirmSwitchToEsql}
      onCancel={cancelSwitchToEsql}
    />
  ) : null;

  return {
    resolveBuilderMode,
    requestEsqlFallback,
    requestSwitchToEsql,
    confirmationModal,
  };
};
