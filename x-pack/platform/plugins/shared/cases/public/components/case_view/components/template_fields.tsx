/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import type { z } from '@kbn/zod/v4';
import { FormProvider, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { CaseUI } from '../../../../common';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/latest';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { useGetTemplate } from '../../templates_v2/hooks/use_get_template';
import { FieldsRenderer } from '../../templates_v2/field_types/field_renderer';
import { useResolvedFields } from '../../field_library/hooks/use_resolved_fields';
import { getFieldCamelKey, getFieldSnakeKey } from '../../../../common/utils';
import type { OnUpdateFields } from '../types';
import { SAVE } from '../../../common/translations';

type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

interface TemplateFieldsProps {
  caseData: CaseUI;
  onUpdateField: (args: OnUpdateFields) => void;
  isLoading: boolean;
  loadingKey: string | null;
}

const TemplateFieldsFormReady: FC<{
  resolvedFields: InlineField[];
  extendedFields: Record<string, unknown>;
  onUpdateField: (args: OnUpdateFields) => void;
  isLoading: boolean;
}> = ({ resolvedFields, extendedFields, onUpdateField, isLoading }) => {
  const initialDefaultValues = useMemo(() => {
    const defaults: Record<string, Record<string, unknown>> = { [CASE_EXTENDED_FIELDS]: {} };
    for (const field of resolvedFields) {
      const fieldKey = getFieldSnakeKey(field.name, field.type);
      defaults[CASE_EXTENDED_FIELDS][fieldKey] =
        extendedFields[getFieldCamelKey(field.name, field.type)] ?? '';
    }
    return defaults;
  }, [resolvedFields, extendedFields]);

  const { form } = useForm<{}>({
    defaultValue: initialDefaultValues,
    options: { stripEmptyFields: false },
  });

  const onSave = async () => {
    const { isValid, data } = await form.submit();
    if (!isValid) return;
    const fields = (data as Record<string, Record<string, unknown>>)?.[CASE_EXTENDED_FIELDS];
    if (!fields) return;
    onUpdateField({ key: CASE_EXTENDED_FIELDS, value: fields });
  };

  return (
    <FormProvider form={form}>
      <FieldsRenderer resolvedFields={resolvedFields} form={form} />
      <EuiFlexGroup alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="primary"
            data-test-subj="template-fields-save"
            fill
            iconType="save"
            onClick={onSave}
            size="s"
            isLoading={isLoading}
          >
            {SAVE}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </FormProvider>
  );
};

TemplateFieldsFormReady.displayName = 'TemplateFieldsFormReady';

const TemplateFieldsForm: FC<{
  parsedTemplate: ParsedTemplateDefinition;
  owner: string;
  extendedFields: Record<string, unknown>;
  onUpdateField: (args: OnUpdateFields) => void;
  isLoading: boolean;
}> = ({ parsedTemplate, owner, extendedFields, onUpdateField, isLoading }) => {
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
      isLoading={isLoading}
    />
  );
};

TemplateFieldsForm.displayName = 'TemplateFieldsForm';

export const TemplateFields = React.memo<TemplateFieldsProps>(
  ({ caseData, onUpdateField, isLoading }) => {
    const { data: templateData } = useGetTemplate(
      caseData.template?.id,
      caseData.template?.version
    );

    const parsedTemplate = templateData?.definition;
    if (!templateData || !parsedTemplate || parsedTemplate.fields.length === 0) return null;

    return (
      <TemplateFieldsForm
        parsedTemplate={parsedTemplate}
        owner={templateData.owner}
        extendedFields={caseData.extendedFields ?? {}}
        onUpdateField={onUpdateField}
        isLoading={isLoading}
      />
    );
  }
);

TemplateFields.displayName = 'TemplateFields';
