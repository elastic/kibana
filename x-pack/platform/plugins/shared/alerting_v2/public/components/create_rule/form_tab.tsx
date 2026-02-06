/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiCallOut, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Controller, useForm } from 'react-hook-form';
import type { HttpStart } from '@kbn/core/public';
import type { NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FormValues } from '@kbn/alerting-v2-rule-form/form/types';
import { RuleFields } from '@kbn/alerting-v2-rule-form';
import type { CreateRuleData } from '@kbn/alerting-v2-schemas';
import { QueryEditor } from './query_editor';
import { RuleFooter } from './rule_footer';

interface FormTabProps {
  stagedRule: Partial<CreateRuleData>;
  onFormChange: (
    values: FormValues
  ) => { success: true; data: CreateRuleData } | { success: false };
  onFormReady?: (getCurrentValues: () => FormValues) => void;
  onSave: () => void;
  onCancel: () => void;
  services: {
    http: HttpStart;
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
    notifications: NotificationsStart;
  };
  isReadOnly: boolean;
  isSubmitting: boolean;
  isEditing: boolean;
  error: React.ReactNode | null;
  errorTitle: React.ReactNode | null;
}

export const FormTab: React.FC<FormTabProps> = ({
  stagedRule,
  onFormChange,
  onFormReady,
  onSave,
  onCancel,
  services,
  isReadOnly,
  isSubmitting,
  isEditing,
  error,
  errorTitle,
}) => {
  const {
    control,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: stagedRule as FormValues,
  });

  const query = watch('query');

  // Expose getCurrentValues function to parent
  useEffect(() => {
    if (onFormReady) {
      onFormReady(() => watch());
    }
  }, [onFormReady, watch]);

  // Reset form when stagedRule changes (e.g., on tab switch)
  useEffect(() => {
    reset(stagedRule as FormValues);
  }, [stagedRule, reset]);

  // Sync to parent on field blur
  const handleBlur = () => {
    const formValues = watch();
    onFormChange(formValues);
  };

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
              onBlur={() => {
                field.onBlur();
                handleBlur();
              }}
              isReadOnly={isReadOnly}
            />
          )}
        />
      </EuiFormRow>

      <EuiSpacer />

      <RuleFooter
        onSave={onSave}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        isEditing={isEditing}
      />
    </>
  );
};
