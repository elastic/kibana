/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiCallOut, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Controller, useForm } from 'react-hook-form';
import type { HttpStart } from '@kbn/core/public';
import type { NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FormValues } from '@kbn/alerting-v2-rule-form/form/types';
import { RuleFields } from '@kbn/alerting-v2-rule-form';
import { createRuleDataSchema, type CreateRuleData } from '@kbn/alerting-v2-schemas';
import type { RulesApi } from '../../services/rules_api';
import { QueryEditor } from './query_editor';
import { RuleFooter } from './rule_footer';

const DEFAULT_RULE_VALUES: CreateRuleData = {
  name: 'Example rule',
  tags: [],
  schedule: { custom: '1m' },
  enabled: true,
  query: 'FROM logs-* | LIMIT 1',
  timeField: '@timestamp',
  lookbackWindow: '5m',
  groupingKey: [],
};

interface FormTabProps {
  ruleId?: string;
  isEditing: boolean;
  onCancel: () => void;
  onSaveSuccess: () => void;
  services: {
    http: HttpStart;
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
    notifications: NotificationsStart;
    rulesApi: RulesApi;
  };
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export const FormTab: React.FC<FormTabProps> = ({
  ruleId,
  isEditing,
  onCancel,
  onSaveSuccess,
  services,
}) => {
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [errorTitle, setErrorTitle] = useState<React.ReactNode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: DEFAULT_RULE_VALUES as FormValues,
  });

  const query = watch('query');

  // Load rule data when in edit mode
  useEffect(() => {
    if (!ruleId) {
      reset(DEFAULT_RULE_VALUES as FormValues);
      return;
    }

    let cancelled = false;
    const loadRule = async () => {
      setIsLoading(true);
      setError(null);
      setErrorTitle(null);

      try {
        const rule = await services.rulesApi.getRule(ruleId);
        if (cancelled) {
          return;
        }

        const nextPayload: CreateRuleData = {
          ...DEFAULT_RULE_VALUES,
          name: rule.name,
          tags: rule.tags ?? DEFAULT_RULE_VALUES.tags,
          schedule: rule.schedule?.custom
            ? { custom: rule.schedule.custom }
            : DEFAULT_RULE_VALUES.schedule,
          enabled: rule.enabled ?? DEFAULT_RULE_VALUES.enabled,
          query: rule.query ?? DEFAULT_RULE_VALUES.query,
          timeField: rule.timeField ?? DEFAULT_RULE_VALUES.timeField,
          lookbackWindow: rule.lookbackWindow ?? DEFAULT_RULE_VALUES.lookbackWindow,
          groupingKey: rule.groupingKey ?? DEFAULT_RULE_VALUES.groupingKey,
        };

        reset(nextPayload as FormValues);
      } catch (err) {
        if (!cancelled) {
          setErrorTitle(
            <FormattedMessage
              id="xpack.alertingV2.createRule.loadErrorTitle"
              defaultMessage="Failed to load rule"
            />
          );
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadRule();

    return () => {
      cancelled = true;
    };
  }, [ruleId, services.rulesApi, reset]);

  const onSubmit = async (formValues: FormValues) => {
    setIsSubmitting(true);
    setError(null);
    setErrorTitle(null);

    try {
      // Validate rule data
      const validated = createRuleDataSchema.safeParse(formValues);
      if (!validated.success) {
        setErrorTitle(
          <FormattedMessage
            id="xpack.alertingV2.createRule.validationTitle"
            defaultMessage="Rule validation failed"
          />
        );
        setError(validated.error.message);
        setIsSubmitting(false);
        return;
      }

      // Save rule
      if (isEditing && ruleId) {
        await services.rulesApi.updateRule(ruleId, validated.data);
      } else {
        await services.rulesApi.createRule(validated.data);
      }

      onSaveSuccess();
    } catch (err) {
      setErrorTitle(
        <FormattedMessage
          id="xpack.alertingV2.createRule.saveErrorTitle"
          defaultMessage="Failed to save rule"
        />
      );
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadOnly = isLoading || isSubmitting;

  return (
    <>
      <EuiSpacer size="m" />
      {error ? (
        <>
          <EuiCallOut
            title={
              errorTitle ?? (
                <FormattedMessage
                  id="xpack.alertingV2.createRule.errorTitle"
                  defaultMessage="Failed to create rule"
                />
              )
            }
            color="danger"
            iconType="error"
            announceOnMount
          >
            {error}
          </EuiCallOut>
          <EuiSpacer />
        </>
      ) : null}

      <RuleFields
        control={control}
        errors={errors}
        setValue={setValue}
        query={query || ''}
        services={{ http: services.http, data: services.data, dataViews: services.dataViews }}
      />

      <EuiSpacer size="m" />

      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.alertingV2.createRule.queryLabel"
            defaultMessage="ES|QL Query"
          />
        }
        fullWidth
        helpText={
          <FormattedMessage
            id="xpack.alertingV2.createRule.queryHelpText"
            defaultMessage="Define the ES|QL query to execute for this rule."
          />
        }
        isInvalid={!!errors.query}
        error={errors.query?.message}
      >
        <Controller
          control={control}
          name="query"
          render={({ field }) => (
            <QueryEditor
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              isReadOnly={isReadOnly}
            />
          )}
        />
      </EuiFormRow>

      <EuiSpacer />

      <RuleFooter
        onSave={handleSubmit(onSubmit)}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        isEditing={isEditing}
      />
    </>
  );
};
