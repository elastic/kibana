/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect, useMemo } from 'react';
import { EuiCallOut, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormProvider, useForm } from 'react-hook-form';
import {
  UseField,
  useFormContext as useParentFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { HiddenField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { CASE_EXTENDED_FIELDS } from '../../../common/constants';
import { useTemplateFormSync } from './use_template_form_sync';
import * as i18n from './translations';
import { FieldsRenderer } from '../templates_v2/field_types/field_renderer';
import { useResolvedFields } from '../field_library/hooks/use_resolved_fields';
import { TemplateFieldsValidationContext } from './template_fields_validation_context';

type FormShape = Record<string, Record<string, unknown>>;

export const CreateCaseTemplateFields: React.FC = () => {
  const parentForm = useParentFormContext();
  const [{ templateId }] = useFormData<{ templateId?: string }>({ watch: ['templateId'] });

  const innerForm = useForm<FormShape>({
    defaultValues: { [CASE_EXTENDED_FIELDS]: {} },
  });

  const { template, isLoading } = useTemplateFormSync(innerForm);

  // Mirror the inner RHF `extendedFields` slice into the parent form_lib field
  // on every change so the parent's submission picks up the latest values.
  useEffect(() => {
    const subscription = innerForm.watch((values) => {
      const slice = values?.[CASE_EXTENDED_FIELDS] ?? {};
      parentForm.setFieldValue(CASE_EXTENDED_FIELDS, slice);
    });
    return () => subscription.unsubscribe();
  }, [innerForm, parentForm]);

  // Register the inner form's trigger with the validation context so the submit
  // button can run RHF Controller validation (pattern, required_when, etc.) before
  // the parent form-lib submits.
  const triggerRef = useContext(TemplateFieldsValidationContext);
  useEffect(() => {
    triggerRef.current = () => innerForm.trigger();
    return () => {
      triggerRef.current = null;
    };
  }, [innerForm, triggerRef]);

  const { resolvedFields, isLoading: isLoadingFields } = useResolvedFields(
    template?.definition?.fields ?? [],
    template?.owner
  );

  const fieldsFragment = useMemo(() => {
    if (!resolvedFields.length) {
      return null;
    }
    return <FieldsRenderer resolvedFields={resolvedFields} />;
  }, [resolvedFields]);

  if (isLoading || isLoadingFields) {
    return <UseField path={CASE_EXTENDED_FIELDS} component={HiddenField} />;
  }

  if (!templateId || template?.definition?.fields === undefined) {
    return (
      <>
        <UseField path={CASE_EXTENDED_FIELDS} component={HiddenField} />
        <EuiSpacer />
        <EuiCallOut announceOnMount title={i18n.TEMPLATE_NOT_SELECTED_TITLE} size="s">
          <p>{i18n.TEMPLATE_NOT_SELECTED_DESCRIPTION}</p>
        </EuiCallOut>
      </>
    );
  }

  return (
    <>
      <UseField path={CASE_EXTENDED_FIELDS} component={HiddenField} />
      <EuiSpacer />
      <EuiTitle size="s">
        <h4>{i18n.EXTENDED_FIELDS_TITLE}</h4>
      </EuiTitle>
      <EuiSpacer />
      <FormProvider {...innerForm}>{fieldsFragment}</FormProvider>
    </>
  );
};

CreateCaseTemplateFields.displayName = 'CreateCaseTemplateFields';
