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
import { useCasesContext } from '../cases_context/use_cases_context';
import { useTemplateFormSync } from './use_template_form_sync';
import * as i18n from './translations';
import * as libI18n from '../field_library/translations';
import { FieldsRenderer } from '../templates_v2/field_types/field_renderer';
import { useResolvedFields } from '../field_library/hooks/use_resolved_fields';
import { useGetFieldDefinitions } from '../field_library/hooks/use_get_field_definitions';
import { parseFieldDefinitionsToInlineFields, getFieldSnakeKey } from '../../../common/utils';
import { isRefField } from '../../../common/types/domain/template/fields';
import { TemplateFieldsValidationContext } from './template_fields_validation_context';

type FormShape = Record<string, Record<string, unknown>>;

export const CreateCaseTemplateFields: React.FC = () => {
  const parentForm = useParentFormContext();
  const [{ templateId }] = useFormData<{ templateId?: string }>({ watch: ['templateId'] });
  const { owner } = useCasesContext();
  const ownerStr = Array.isArray(owner) ? owner[0] : owner;

  // Fetch applyToAllCases field definitions for this owner.
  const {
    data: globalFieldDefsData,
    isLoading: isLoadingGlobalDefs,
    isError: isGlobalDefsError,
  } = useGetFieldDefinitions({
    owner: ownerStr,
    applyToAllCases: true,
  });

  // Resolve global field definitions to inline fields and compute their snake keys.
  // globalFieldKeys tracks ALL global fields for form-state preservation in useTemplateFormSync,
  // even those hidden because the active template already renders them via $ref.
  const { globalInlineFields, globalFieldKeys } = useMemo(() => {
    const defs = globalFieldDefsData?.fieldDefinitions ?? [];
    const inlineFields = parseFieldDefinitionsToInlineFields(defs);
    const keys = new Set(inlineFields.map((f) => getFieldSnakeKey(f.name, f.type)));
    return { globalInlineFields: inlineFields, globalFieldKeys: keys };
  }, [globalFieldDefsData]);

  const innerForm = useForm<FormShape>({
    defaultValues: { [CASE_EXTENDED_FIELDS]: {} },
  });

  const { template, isLoading } = useTemplateFormSync(innerForm, globalFieldKeys);

  // Fields referenced by the template via $ref are owned by the template section —
  // exclude them from the global section to avoid duplicate inputs.
  const templateRefNames = useMemo<ReadonlySet<string>>(
    () => new Set((template?.definition?.fields ?? []).filter(isRefField).map((f) => f.$ref)),
    [template]
  );

  const visibleGlobalInlineFields = useMemo(
    () => globalInlineFields.filter((f) => !templateRefNames.has(f.name)),
    [globalInlineFields, templateRefNames]
  );

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

  const { resolvedFields: templateFields, isLoading: isLoadingFields } = useResolvedFields(
    template?.definition?.fields ?? [],
    template?.owner
  );

  const globalFieldsFragment = useMemo(() => {
    if (!visibleGlobalInlineFields.length) return null;
    return (
      <>
        <EuiSpacer />
        <EuiTitle size="s">
          <h4>{libI18n.GLOBAL_FIELDS_TITLE}</h4>
        </EuiTitle>
        <EuiSpacer />
        <FieldsRenderer resolvedFields={visibleGlobalInlineFields} />
      </>
    );
  }, [visibleGlobalInlineFields]);

  const templateFieldsFragment = useMemo(() => {
    if (!templateId || template?.definition?.fields === undefined) return null;
    if (!templateFields.length) return null;
    return (
      <>
        <EuiSpacer />
        <EuiTitle size="s">
          <h4>{i18n.EXTENDED_FIELDS_TITLE}</h4>
        </EuiTitle>
        <EuiSpacer />
        <FieldsRenderer resolvedFields={templateFields} />
      </>
    );
  }, [templateId, template, templateFields]);

  if (isLoading || isLoadingFields || isLoadingGlobalDefs || isGlobalDefsError) {
    return <UseField path={CASE_EXTENDED_FIELDS} component={HiddenField} />;
  }

  // Render nothing if there are no visible global fields and no template fields to show.
  if (
    !visibleGlobalInlineFields.length &&
    (!templateId || template?.definition?.fields === undefined)
  ) {
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
      <FormProvider {...innerForm}>
        {globalFieldsFragment}
        {templateFieldsFragment}
      </FormProvider>
    </>
  );
};

CreateCaseTemplateFields.displayName = 'CreateCaseTemplateFields';
