/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { camelCase, snakeCase } from 'lodash';
import type { CaseUI } from '../../../../common';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import { FieldType } from '../../templates_v2/field_types/constants';
import { useGetTemplate } from '../../templates_v2/hooks/use_get_template';
import { EditTextField } from './edit_text_field';
import { EditTextareaField } from './edit_textarea_field';
import { EditNumberField } from './edit_number_field';
import { EditComboboxField } from './edit_combobox_field';
import type { OnUpdateFields } from '../types';

interface TemplateFieldsProps {
  caseData: CaseUI;
  onUpdateField: (args: OnUpdateFields) => void;
  isLoading: boolean;
  loadingKey: string | null;
}

export const TemplateFields = React.memo<TemplateFieldsProps>(
  ({ caseData, onUpdateField, isLoading, loadingKey }) => {
    const { data: templateData, isLoading: isLoadingTemplate } = useGetTemplate(
      caseData.template?.id,
      caseData.template?.version
    );
    const templateFields = templateData?.definition?.fields ?? [];

    return (
      <>
        {templateFields.map((field) => {
          const fieldKey = `${field.name}_as_${field.type}`;
          const fieldIsLoading =
            isLoadingTemplate || (isLoading && loadingKey === CASE_EXTENDED_FIELDS);
          const onSubmit = (value: unknown) =>
            onUpdateField({
              key: CASE_EXTENDED_FIELDS,
              value: { [snakeCase(fieldKey)]: value },
            });
          const extendedFieldValue = caseData.extendedFields?.[camelCase(fieldKey)] ?? '';

          switch (field.control) {
            case FieldType.INPUT_TEXT:
              return (
                <EditTextField
                  key={field.name}
                  title={field.label ?? field.name}
                  value={String(extendedFieldValue)}
                  onSubmit={onSubmit}
                  isLoading={fieldIsLoading}
                  data-test-subj={`template-field-${field.name}`}
                />
              );
            case FieldType.INPUT_NUMBER:
              return (
                <EditNumberField
                  key={field.name}
                  title={field.label ?? field.name}
                  value={String(extendedFieldValue)}
                  onSubmit={onSubmit}
                  isLoading={fieldIsLoading}
                  data-test-subj={`template-field-${field.name}`}
                />
              );
            case FieldType.TEXTAREA:
              return (
                <EditTextareaField
                  key={field.name}
                  title={field.label ?? field.name}
                  value={String(extendedFieldValue)}
                  onSubmit={onSubmit}
                  isLoading={fieldIsLoading}
                  data-test-subj={`template-field-${field.name}`}
                />
              );
            case FieldType.SELECT_BASIC:
              return (
                <EditComboboxField
                  key={field.name}
                  title={field.label ?? field.name}
                  value={extendedFieldValue ? [String(extendedFieldValue)] : []}
                  options={field.metadata?.options ?? []}
                  onSubmit={onSubmit}
                  isLoading={fieldIsLoading}
                  singleSelection
                  data-test-subj={`template-field-${field.name}`}
                />
              );
            default:
              return null;
          }
        })}
      </>
    );
  }
);

TemplateFields.displayName = 'TemplateFields';
