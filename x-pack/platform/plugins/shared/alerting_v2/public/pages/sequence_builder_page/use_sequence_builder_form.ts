/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@kbn/react-query';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { FormValues } from '@kbn/alerting-v2-rule-form';
import {
  DEFAULT_SEQUENCE_FORM_VALUES,
  buildSequenceRuleQueryData,
  composeFormToCreateRequest,
} from '@kbn/alerting-v2-rule-form';
import type { SequenceFormValues } from '@kbn/alerting-v2-rule-form';
import { RulesApi } from '../../services/rules_api';
import { ruleKeys } from '../../hooks/query_key_factory';
import { paths } from '../../constants';

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

const DEFAULT_FORM_VALUES = getDefaultFormValues();

export const useSequenceBuilderForm = () => {
  const methods = useForm<FormValues>({ mode: 'onBlur', defaultValues: DEFAULT_FORM_VALUES });
  return { methods, isLoading: false };
};

export const useSequenceBuilderState = () => {
  const rulesApi = useService(RulesApi);
  const { navigateToUrl } = useService(CoreStart('application'));
  const basePath = useService(CoreStart('http')).basePath;
  const notifications = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  const [seqValues, setSeqValues] = useState<SequenceFormValues>(DEFAULT_SEQUENCE_FORM_VALUES);
  const [step, setStep] = useState<SequenceBuilderStep>('alert');
  const [isSaving, setIsSaving] = useState(false);

  const seqValuesRef = useRef(seqValues);
  seqValuesRef.current = seqValues;

  const save = useCallback(
    async (formValues: FormValues) => {
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

        // Saved as a plain ES|QL rule: the sequence page compiles the query
        // itself and has no registered builder, and a `builder_type` now means
        // the server generates the query from `metadata.builder_fields`.
        const payload = composeFormToCreateRequest(merged);
        await rulesApi.createRule(payload);

        queryClient.invalidateQueries(ruleKeys.lists());
        queryClient.invalidateQueries(ruleKeys.tags());

        notifications.toasts.addSuccess(
          i18n.translate('xpack.alertingV2.sequenceBuilder.saveSuccess', {
            defaultMessage: 'Sequence rule saved successfully.',
          })
        );

        navigateToUrl(basePath.prepend(paths.ruleList));
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
    [rulesApi, navigateToUrl, basePath, notifications, queryClient]
  );

  return {
    seqValues,
    setSeqValues,
    step,
    setStep,
    isSaving,
    save,
  };
};
