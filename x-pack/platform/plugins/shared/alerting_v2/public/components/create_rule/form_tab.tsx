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
import { FieldGroup } from '@kbn/alerting-v2-rule-form/form/field_groups/field_group';
import type { HttpStart } from '@kbn/core/public';
import type { NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FormValues } from '@kbn/alerting-v2-rule-form/form/types';
import { RuleFields } from '@kbn/alerting-v2-rule-form';
import { createRuleDataSchema, type CreateRuleData } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import type { RulesApi } from '../../services/rules_api';
import { QueryEditor } from './query_editor';
import { RuleFooter } from './rule_footer';

const DEFAULT_RULE_VALUES: CreateRuleData = {
  name: '',
  kind: 'alert',
  tags: [],
  schedule: { custom: '5m' },
  enabled: true,
  query: '',
  timeField: '',
  lookbackWindow: '5m',
  groupingKey: [],
};

interface FormTabProps {
  ruleId?: string;
  isEditing: boolean;
  onCancel: () => void;
  saveRule: (formValues: any) => Promise<void>;
  isSubmitting: boolean;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
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
  saveRule,
  isSubmitting,
  setIsSubmitting,
  services,
}) => {
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [errorTitle, setErrorTitle] = useState<React.ReactNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    setValue,
    watch,
    handleSubmit: handleSubmitForm,
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

      await saveRule(validated.data);
    } catch (err) {
      setErrorTitle(
        <FormattedMessage
          id="xpack.alertingV2.createRule.saveErrorTitle"
          defaultMessage="Failed to save rule"
        />
      );
      setError(getErrorMessage(err));
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
            data-test-subj="createRuleErrorCallout"
          >
            {error}
          </EuiCallOut>
          <EuiSpacer />
        </>
      ) : null}

      <FieldGroup
        title={i18n.translate('xpack.alertingV2.createRuleForm.ruleData', {
          defaultMessage: 'Rule data',
        })}
      >
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
      </FieldGroup>

      <EuiSpacer size="m" />

      <RuleFields
        control={control}
        errors={errors}
        setValue={setValue}
        query={query || ''}
        services={{ http: services.http, data: services.data, dataViews: services.dataViews }}
      />

      <EuiSpacer size="m" />

      <RuleFooter
        onSave={handleSubmitForm(onSubmit)}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        isEditing={isEditing}
      />
    </>
  );
};
