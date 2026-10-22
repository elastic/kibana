/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleKind } from '@kbn/alerting-v2-schemas';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { FormValues } from '@kbn/alerting-v2-rule-form';
import { getBreachEsqlQuery, getRecoverEsqlQuery } from '@kbn/alerting-v2-schemas';
import {
  mapRuleToComposeFormValues,
  parseSequenceEsql,
  DEFAULT_SEQUENCE_FORM_VALUES,
  buildSequenceRuleQueryData,
  composeFormToCreateRequest,
} from '@kbn/alerting-v2-rule-form';
import type { SequenceFormValues } from '@kbn/alerting-v2-rule-form';
import { RulesApi } from '../../services/rules_api';
import { ruleKeys, sequenceBuilderKeys } from '../../hooks/query_key_factory';
import { useAlertingLocators } from '../../application/locator_context';

export const DEFAULT_SEQUENCE_RULE_NAME = i18n.translate(
  'xpack.alertingV2.sequenceBuilder.defaultRuleName',
  { defaultMessage: 'Untitled sequence rule' }
);

const getDefaultFormValues = (): FormValues => ({
  kind: 'alert',
  metadata: { name: DEFAULT_SEQUENCE_RULE_NAME, enabled: true, description: '', tags: [] },
  timeField: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { base: '', breach: { segment: '' } },
  recovery: undefined,
  grouping: undefined,
  noData: { strategy: 'ignore' },
  stateTransition: undefined,
  stateTransitionAlertDelayMode: 'immediate',
  stateTransitionRecoveryDelayMode: 'immediate',
  artifacts: [],
  runbookArtifacts: [],
  dashboardArtifacts: [],
});

export type SequenceBuilderStep = 'alert' | 'recovery';

export type SequenceBuilderLoadError = 'fetch' | 'parse';

const SEQUENCE_BUILDER_TYPE = 'sequence';

export const useSequenceBuilderForm = (
  ruleId: string | undefined,
  options?: { isClone?: boolean }
) => {
  const isClone = options?.isClone ?? false;
  const rulesApi = useService(RulesApi);

  const {
    data: editData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: sequenceBuilderKeys.editRule(ruleId!),
    enabled: Boolean(ruleId),
    refetchOnWindowFocus: false,
    cacheTime: 0,
    staleTime: Infinity,
    queryFn: ({ signal }) => rulesApi.getRule(ruleId!, signal),
  });

  const initialFormValues = useMemo<FormValues>(() => {
    if (!editData) return getDefaultFormValues();
    const mapped = mapRuleToComposeFormValues(editData);
    if (isClone) {
      return {
        ...mapped,
        metadata: {
          ...mapped.metadata,
          name: i18n.translate('xpack.alertingV2.sequenceBuilder.clonedRuleName', {
            defaultMessage: '{name} (clone)',
            values: { name: mapped.metadata.name },
          }),
        },
      };
    }
    return mapped;
  }, [editData, isClone]);
  const methods = useForm<FormValues>({ mode: 'onBlur', values: initialFormValues });

  const rawParsedSeqValues = useMemo<SequenceFormValues | undefined>(() => {
    if (!editData) return undefined;
    if (editData.metadata.builder?.type !== SEQUENCE_BUILDER_TYPE) return undefined;
    const breachQuery = editData.query ? getBreachEsqlQuery(editData.query) : '';
    if (!breachQuery) return undefined;
    const recoveryQuery = editData.query
      ? getRecoverEsqlQuery(editData.query, editData.recovery)
      : undefined;
    try {
      return parseSequenceEsql(breachQuery, recoveryQuery) ?? undefined;
    } catch {
      return undefined;
    }
  }, [editData]);

  const parsedRuleIds = useMemo<string[]>(
    () =>
      rawParsedSeqValues
        ? [...new Set(rawParsedSeqValues.steps.flatMap((s) => s.rules.map((r) => r.ruleId)))]
        : [],
    [rawParsedSeqValues]
  );

  const { data: ruleFetchResult, isLoading: isRuleFetchLoading } = useQuery<{
    rules: Record<string, { name: string; groupingFields: string[]; kind: RuleKind }>;
    failedCount: number;
  }>({
    queryKey: sequenceBuilderKeys.ruleFetch(parsedRuleIds),
    enabled: parsedRuleIds.length > 0,
    refetchOnWindowFocus: false,
    cacheTime: 0,
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const settled = await Promise.allSettled(
        parsedRuleIds.map((id) => rulesApi.getRule(id, signal))
      );
      const rules: Record<string, { name: string; groupingFields: string[]; kind: RuleKind }> = {};
      let failedCount = 0;
      for (const result of settled) {
        if (result.status === 'fulfilled') {
          const rule = result.value;
          rules[rule.id] = {
            name: rule.metadata.name,
            groupingFields: rule.grouping?.fields ?? [],
            kind: rule.kind,
          };
        } else {
          failedCount++;
        }
      }
      return { rules, failedCount };
    },
  });

  const isRuleFetchPending = parsedRuleIds.length > 0 && isRuleFetchLoading;

  const fetchedRules = ruleFetchResult?.rules;

  const parsedSeqValues = useMemo<SequenceFormValues | undefined>(() => {
    if (!rawParsedSeqValues) return undefined;
    if (isRuleFetchPending) return undefined;
    if (!fetchedRules) return rawParsedSeqValues;

    return {
      ...rawParsedSeqValues,
      steps: rawParsedSeqValues.steps.map((step) => ({
        ...step,
        rules: step.rules.map((r) => {
          const fetched = fetchedRules[r.ruleId];
          return {
            ...r,
            ruleName: fetched?.name ?? r.ruleName,
            groupingFields: fetched?.groupingFields ?? r.groupingFields,
            kind: fetched?.kind ?? r.kind,
            isMissing: !fetched,
          };
        }),
      })),
    };
  }, [rawParsedSeqValues, isRuleFetchPending, fetchedRules]);

  const loadError = useMemo<SequenceBuilderLoadError | undefined>(() => {
    if (!ruleId) return undefined;
    if (isError) return 'fetch';
    if (editData && !rawParsedSeqValues) return 'parse';
    return undefined;
  }, [ruleId, isError, editData, rawParsedSeqValues]);

  return {
    methods,
    isLoading: (Boolean(ruleId) && isLoading) || isRuleFetchPending,
    loadError,
    parsedSeqValues,
    savedRecoveryStepIndices: rawParsedSeqValues?.recoveryStepIndices,
    savedStepsCount: rawParsedSeqValues?.steps.length,
  };
};

export const useSequenceBuilderState = (initialSeqValues?: SequenceFormValues) => {
  const rulesApi = useService(RulesApi);
  const notifications = useService(CoreStart('notifications'));
  const { rulesLocators } = useAlertingLocators();
  const queryClient = useQueryClient();

  const [seqValues, setSeqValues] = useState<SequenceFormValues>(
    initialSeqValues ?? DEFAULT_SEQUENCE_FORM_VALUES
  );
  const [step, setStep] = useState<SequenceBuilderStep>('alert');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const seqValuesRef = useRef(seqValues);
  seqValuesRef.current = seqValues;

  const save = useCallback(
    async (formValues: FormValues, ruleId?: string) => {
      setIsSaving(true);
      try {
        const queryData = buildSequenceRuleQueryData(seqValuesRef.current);
        if (!queryData) {
          throw new Error(
            i18n.translate('xpack.alertingV2.sequenceBuilder.invalidSequenceError', {
              defaultMessage: 'Sequence is not valid — add at least two steps.',
            })
          );
        }

        const merged: FormValues = {
          ...formValues,
          kind: 'alert',
          query: { base: queryData.breachQuery, breach: { segment: '' } },
          grouping:
            queryData.groupingFields.length > 0 ? { fields: queryData.groupingFields } : undefined,
          schedule: {
            ...formValues.schedule,
            lookback: queryData.lookbackString,
          },
          noData: { strategy: 'ignore' },
          recovery: queryData.recoveryQuery
            ? { strategy: 'query', query: queryData.recoveryQuery }
            : undefined,
        };

        const payload = composeFormToCreateRequest(merged, SEQUENCE_BUILDER_TYPE);

        if (ruleId) {
          await rulesApi.upsertRule(ruleId, payload);
        } else {
          await rulesApi.createRule(payload);
        }

        queryClient.invalidateQueries(ruleKeys.lists());
        queryClient.invalidateQueries(ruleKeys.allTags());
        if (ruleId) {
          queryClient.invalidateQueries(ruleKeys.detail(ruleId));
          queryClient.removeQueries(sequenceBuilderKeys.editRule(ruleId));
        }

        notifications.toasts.addSuccess(
          i18n.translate('xpack.alertingV2.sequenceBuilder.saveSuccess', {
            defaultMessage: 'Sequence rule saved successfully.',
          })
        );

        rulesLocators.navigateSync({});
      } catch (err) {
        notifications.toasts.addError(err instanceof Error ? err : new Error(String(err)), {
          title: i18n.translate('xpack.alertingV2.sequenceBuilder.saveError', {
            defaultMessage: 'Failed to save sequence rule',
          }),
        });
      } finally {
        setIsSaving(false);
      }
    },
    [rulesApi, rulesLocators, notifications, queryClient]
  );

  return {
    seqValues,
    setSeqValues,
    step,
    setStep,
    sidebarOpen,
    setSidebarOpen,
    isSaving,
    save,
  };
};
