/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { camelCase, snakeCase } from 'lodash';
import type { CaseUI } from '../../../../common';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import { FieldType } from '../../templates_v2/field_types/constants';
import { useGetTemplate } from '../../templates_v2/hooks/use_get_template';
import { controlRegistry } from '../../templates_v2/field_types/field_types_registry';
import { EditFieldAdapter } from './edit_field_adapter';
import type { OnUpdateFields } from '../types';

interface TemplateFieldsProps {
  caseData: CaseUI;
  onUpdateField: (args: OnUpdateFields) => void;
  isLoading: boolean;
  loadingKey: string | null;
}

const prepareFieldValue = (fieldControl: FieldType, extendedFieldValue: string) => {
  return fieldControl === FieldType.SELECT_BASIC
    ? extendedFieldValue
      ? [String(extendedFieldValue)]
      : []
    : String(extendedFieldValue);
};

const processFieldValue = (fieldControl: FieldType, value: unknown) => {
  return fieldControl === FieldType.SELECT_BASIC && Array.isArray(value) ? value[0] ?? '' : value;
};

export const TemplateFields = React.memo<TemplateFieldsProps>(
  ({ caseData, onUpdateField, isLoading, loadingKey }) => {
    const { data: templateData, isLoading: isLoadingTemplate } = useGetTemplate(
      caseData.template?.id,
      caseData.template?.version
    );

    const templateFields = templateData?.definition?.fields ?? [];

    const handleFieldSubmit = useCallback(
      (fieldKey: string, fieldControl: FieldType) => (value: unknown) => {
        const processedValue = processFieldValue(fieldControl, value);

        onUpdateField({
          key: CASE_EXTENDED_FIELDS,
          value: { [snakeCase(fieldKey)]: processedValue },
        });
      },
      [onUpdateField]
    );

    return (
      <>
        {templateFields.map((field) => {
          const fieldKey = `${field.name}_as_${field.type}`;
          const fieldIsLoading =
            isLoadingTemplate || (isLoading && loadingKey === CASE_EXTENDED_FIELDS);
          const extendedFieldValue = caseData.extendedFields?.[camelCase(fieldKey)] ?? '';

          const FieldComponent = controlRegistry[field.control];

          if (!FieldComponent) {
            return null;
          }

          const fieldValue = prepareFieldValue(field.control, extendedFieldValue);

          return (
            <EditFieldAdapter
              key={field.name}
              value={fieldValue}
              onSubmit={handleFieldSubmit(fieldKey, field.control)}
              isLoading={fieldIsLoading}
              data-test-subj={`template-field-${field.name}`}
              FieldComponent={FieldComponent}
              componentProps={field}
            />
          );
        })}
      </>
    );
  }
);

TemplateFields.displayName = 'TemplateFields';
