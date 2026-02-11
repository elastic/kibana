/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useForm } from 'react-hook-form';
import type { HttpStart } from '@kbn/core/public';
import type { NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FormValues } from '@kbn/alerting-v2-rule-form/form/types';
import { RuleFields } from '@kbn/alerting-v2-rule-form';
import { createRuleDataSchema } from '@kbn/alerting-v2-schemas';
import type { RulesApi } from '../../services/rules_api';
import { useExistingRule } from '../../hooks/use_existing_rule';
import { RuleData } from './fields/rule_data';
import { RuleFooter } from './rule_footer';
import { DEFAULT_RULE_VALUES } from '../../constants';

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

  // Load existing rule data in edit mode
  const { rule: existingRule, isLoading } = useExistingRule(ruleId, services.rulesApi);

  // Update form when existing rule is loaded or when switching to create mode
  useEffect(() => {
    if (ruleId && existingRule) {
      reset(existingRule as FormValues);
    } else if (!ruleId) {
      reset(DEFAULT_RULE_VALUES as FormValues);
    }
  }, [existingRule, ruleId, reset]);

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
      {error ? (
        <>
          <EuiSpacer size="m" />
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
      <EuiSpacer size="m" />
      <RuleData control={control} errors={errors} isReadOnly={isReadOnly} />
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
