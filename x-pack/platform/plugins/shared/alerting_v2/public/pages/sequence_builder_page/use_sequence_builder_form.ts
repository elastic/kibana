/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { FormValues } from '@kbn/alerting-v2-rule-form';
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
  query: { format: 'standalone', breach: { query: '' }, recovery: { query: '' } },
  recoveryStrategy: undefined,
  grouping: undefined,
  noDataStrategy: 'none',
  stateTransition: undefined,
  stateTransitionAlertDelayMode: 'immediate',
  stateTransitionRecoveryDelayMode: 'immediate',
  artifacts: [],
  runbookArtifacts: [],
  dashboardArtifacts: [],
});

export type SequenceBuilderStep = 'alert' | 'recovery';

export const useSequenceBuilderForm = (
  ruleId: string | undefined,
  options?: { isClone?: boolean }
) => {
  const isClone = options?.isClone ?? false;
  const rulesApi = useService(RulesApi);

  const { data: editData, isLoading } = useQuery({
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
    if (editData.query.format === 'composed') return undefined;
    const breachQuery = editData.query.breach?.query;
    if (!breachQuery) return undefined;
    const recoveryQuery = editData.query.recovery?.query;
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
    rules: Record<string, { name: string; groupingFields: string[]; kind: 'alert' | 'signal' }>;
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
      const rules: Record<
        string,
        { name: string; groupingFields: string[]; kind: 'alert' | 'signal' }
      > = {};
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

  return {
    methods,
    isLoading: (Boolean(ruleId) && isLoading) || isRuleFetchPending,
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

  const hasSyncedSeqRef = useRef(false);
  useEffect(() => {
    if (initialSeqValues && !hasSyncedSeqRef.current) {
      hasSyncedSeqRef.current = true;
      setSeqValues(initialSeqValues);
    }
  }, [initialSeqValues]);

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
          query: {
            format: 'standalone',
            breach: { query: queryData.breachQuery },
            ...(queryData.recoveryQuery ? { recovery: { query: queryData.recoveryQuery } } : {}),
          },
          grouping:
            queryData.groupingFields.length > 0 ? { fields: queryData.groupingFields } : undefined,
          schedule: {
            ...formValues.schedule,
            lookback: queryData.lookbackString,
          },
          noDataStrategy: 'none',
          recoveryStrategy: undefined,
        };

        const payload = composeFormToCreateRequest(merged, 'sequence');

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
