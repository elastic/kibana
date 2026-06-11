/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { z } from '@kbn/zod/v4';
import type { FieldValues } from 'react-hook-form';
import { FormProvider, useForm } from 'react-hook-form';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import type { CaseUI } from '../../../../common';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/latest';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { useGetTemplate } from '../../templates_v2/hooks/use_get_template';
import { FieldsRenderer } from '../../templates_v2/field_types/field_renderer';
import { useResolvedFields } from '../../field_library/hooks/use_resolved_fields';
import { useGetFieldDefinitions } from '../../field_library/hooks/use_get_field_definitions';
import {
  getFieldCamelKey,
  getFieldSnakeKey,
  parseFieldDefinitionsToInlineFields,
} from '../../../../common/utils';
import { isInlineField, isRefField } from '../../../../common/types/domain/template/fields';
import * as i18n from '../translations';
import type { OnUpdateFields } from '../types';

type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

const EMPTY_EXTENDED_FIELDS: Record<string, unknown> = {};

interface TemplateFieldsProps {
  caseData: CaseUI;
  onUpdateField: (args: OnUpdateFields) => void;
}

const TemplateFieldsFormReady: FC<{
  resolvedFields: InlineField[];
  extendedFields: Record<string, unknown>;
  onUpdateField: (args: OnUpdateFields) => void;
}> = ({ resolvedFields, extendedFields, onUpdateField }) => {
  const initialDefaultValues = useMemo<FieldValues>(() => {
    const inner: Record<string, unknown> = {};
    for (const field of resolvedFields) {
      const snakeKey = getFieldSnakeKey(field.name, field.type);
      const camelKey = getFieldCamelKey(field.name, field.type);
      inner[snakeKey] = extendedFields[camelKey] ?? '';
    }
    return { [CASE_EXTENDED_FIELDS]: inner };
  }, [resolvedFields, extendedFields]);

  const form = useForm<FieldValues>({
    defaultValues: initialDefaultValues,
    mode: 'onBlur',
  });

  // Reset to fresh defaults whenever the underlying case data changes — e.g.
  // after a successful save the parent re-renders with new extendedFields.
  useEffect(() => {
    form.reset(initialDefaultValues);
  }, [initialDefaultValues, form]);

  const inflightRef = useRef(false);

  const releaseLock = useCallback(() => {
    inflightRef.current = false;
  }, []);

  const persist = useCallback(async () => {
    if (inflightRef.current) return;
    // Claim the lock synchronously before awaiting so a second invocation
    // can't race past the guard above.
    inflightRef.current = true;
    const isValid = await form.trigger().catch(() => false);
    if (!isValid) {
      releaseLock();
      return;
    }
    const values =
      (form.getValues() as Record<string, Record<string, unknown>>)?.[CASE_EXTENDED_FIELDS] ?? {};
    onUpdateField({
      key: CASE_EXTENDED_FIELDS,
      value: values,
      onSuccess: releaseLock,
      onError: releaseLock,
    });
  }, [form, onUpdateField, releaseLock]);

  return (
    <FormProvider {...form}>
      <div data-test-subj="template-fields-form">
        <FieldsRenderer resolvedFields={resolvedFields} onFieldConfirm={persist} />
      </div>
    </FormProvider>
  );
};

TemplateFieldsFormReady.displayName = 'TemplateFieldsFormReady';

const TemplateFieldsForm: FC<{
  parsedTemplate: ParsedTemplateDefinition;
  owner: string;
  extendedFields: Record<string, unknown>;
  onUpdateField: (args: OnUpdateFields) => void;
}> = ({ parsedTemplate, owner, extendedFields, onUpdateField }) => {
  const { resolvedFields, isLoading: isResolvingFields } = useResolvedFields(
    parsedTemplate.fields,
    owner
  );

  const templateKey = useMemo(
    () => resolvedFields.map((f) => `${f.name}:${f.type}`).join('|'),
    [resolvedFields]
  );

  if (isResolvingFields) return null;

  return (
    <TemplateFieldsFormReady
      key={templateKey}
      resolvedFields={resolvedFields}
      extendedFields={extendedFields}
      onUpdateField={onUpdateField}
    />
  );
};

TemplateFieldsForm.displayName = 'TemplateFieldsForm';

export const TemplateFields = React.memo<TemplateFieldsProps>(({ caseData, onUpdateField }) => {
  const { data: templateData } = useGetTemplate(caseData.template?.id, caseData.template?.version);

  const { data: globalFieldDefsData } = useGetFieldDefinitions({
    owner: caseData.owner,
    isGlobal: true,
    // Prevent a background refetch from producing a new Set/array reference that would
    // re-trigger memos and potentially reset an in-progress edit. Same rationale as the
    // create form (create/template_fields.tsx).
    staleTime: Infinity,
  });

  const globalFieldNames = useMemo<ReadonlySet<string>>(
    () =>
      new Set(
        parseFieldDefinitionsToInlineFields(globalFieldDefsData?.fieldDefinitions ?? []).map(
          (f) => f.name
        )
      ),
    [globalFieldDefsData]
  );

  const parsedTemplate = templateData?.definition;

  const filteredTemplateFields = useMemo(
    () =>
      parsedTemplate?.fields.filter((f) => !isInlineField(f) || !globalFieldNames.has(f.name)) ??
      [],
    [parsedTemplate, globalFieldNames]
  );

  if (!templateData || !parsedTemplate || filteredTemplateFields.length === 0) return null;

  return (
    <div>
      <EuiTitle size="xs">
        <h3>{i18n.EXTENDED_FIELDS_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <TemplateFieldsForm
        parsedTemplate={{ ...parsedTemplate, fields: filteredTemplateFields }}
        owner={templateData.owner}
        extendedFields={caseData.extendedFields ?? EMPTY_EXTENDED_FIELDS}
        onUpdateField={onUpdateField}
      />
    </div>
  );
});

TemplateFields.displayName = 'TemplateFields';

interface GlobalCaseFieldsProps {
  caseData: CaseUI;
  onUpdateField: (args: OnUpdateFields) => void;
}

/**
 * Renders all field definitions that have `isGlobal: true` for the
 * case's owner, regardless of which template (if any) the case uses.
 * Fields that are also referenced via `$ref` in the active template are
 * excluded here — the template section owns their display and may apply
 * name/default overrides.
 * Values are stored in `extended_fields` alongside template-specific fields.
 */
export const GlobalCaseFields = React.memo<GlobalCaseFieldsProps>(({ caseData, onUpdateField }) => {
  const {
    data: globalFieldDefsData,
    isLoading,
    isError,
  } = useGetFieldDefinitions({
    owner: caseData.owner,
    isGlobal: true,
    // Prevent a background refetch from producing a new array reference that would
    // re-trigger memos and potentially reset an in-progress edit. Same rationale as the
    // create form (create/template_fields.tsx).
    staleTime: Infinity,
  });

  // React Query deduplicates this fetch — TemplateFields makes the same call.
  const { data: templateData, isLoading: isLoadingTemplate } = useGetTemplate(
    caseData.template?.id,
    caseData.template?.version
  );

  const templateRefNames = useMemo<ReadonlySet<string>>(
    () => new Set((templateData?.definition.fields ?? []).filter(isRefField).map((f) => f.$ref)),
    [templateData]
  );

  const visibleGlobalFields = useMemo<InlineField[]>(
    () =>
      parseFieldDefinitionsToInlineFields(globalFieldDefsData?.fieldDefinitions ?? []).filter(
        (f) => !templateRefNames.has(f.name)
      ),
    [globalFieldDefsData, templateRefNames]
  );

  // Suppress render while the template is loading to prevent a flash of a
  // global field that will be filtered out once the template definition arrives.
  if (
    isLoading ||
    isError ||
    (caseData.template?.id && isLoadingTemplate) ||
    !visibleGlobalFields.length
  )
    return null;

  // When there's no active template, TemplateFields renders nothing (no heading).
  // Provide the section heading here so global fields are labelled in the sidebar.
  const showHeading = !caseData.template?.id;

  return (
    <div>
      {showHeading && (
        <>
          <EuiTitle size="xs">
            <h3>{i18n.EXTENDED_FIELDS_TITLE}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
        </>
      )}
      <TemplateFieldsFormReady
        resolvedFields={visibleGlobalFields}
        extendedFields={caseData.extendedFields ?? EMPTY_EXTENDED_FIELDS}
        onUpdateField={onUpdateField}
      />
    </div>
  );
});

GlobalCaseFields.displayName = 'GlobalCaseFields';
