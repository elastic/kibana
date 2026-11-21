/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldNumber, EuiFieldText, EuiFormRow, EuiSelect, EuiSwitch } from '@elastic/eui';
import type { CreateFormErrors, FieldDrafts, TypeField } from './validation';
import * as i18n from './translations';

export interface TypeFieldsProps {
  fields: TypeField[];
  drafts: FieldDrafts;
  errors: CreateFormErrors['fields'];
  onChange: (key: string, value: string | boolean) => void;
}

/** Inputs for the form fields of the selected investigation type, rendered by field type. */
export const TypeFields: React.FC<TypeFieldsProps> = ({ fields, drafts, errors, onChange }) => (
  <>
    {fields.map((field) => {
      const draft = drafts[field.key];
      const error = errors[field.key];
      const testSubj = `investigationCreateField-${field.key}`;

      if (field.type === 'bool') {
        return (
          <EuiFormRow key={field.key} fullWidth>
            <EuiSwitch
              label={field.label}
              checked={draft === true}
              onChange={(event) => onChange(field.key, event.target.checked)}
              data-test-subj={testSubj}
            />
          </EuiFormRow>
        );
      }

      const text = typeof draft === 'string' ? draft : '';

      if (field.options && field.options.length > 0) {
        return (
          <EuiFormRow key={field.key} label={field.label} fullWidth>
            <EuiSelect
              fullWidth
              options={[
                { value: '', text: i18n.FIELD_NO_OPTION },
                ...field.options.map((option) => ({ value: option, text: option })),
              ]}
              value={text}
              onChange={(event) => onChange(field.key, event.target.value)}
              data-test-subj={testSubj}
            />
          </EuiFormRow>
        );
      }

      if (field.type === 'long' || field.type === 'double') {
        return (
          <EuiFormRow
            key={field.key}
            label={field.label}
            fullWidth
            isInvalid={Boolean(error)}
            error={error}
          >
            <EuiFieldNumber
              fullWidth
              step={field.type === 'long' ? 1 : 'any'}
              value={text}
              isInvalid={Boolean(error)}
              onChange={(event) => onChange(field.key, event.target.value)}
              data-test-subj={testSubj}
            />
          </EuiFormRow>
        );
      }

      return (
        <EuiFormRow
          key={field.key}
          label={field.label}
          fullWidth
          isInvalid={Boolean(error)}
          error={error}
        >
          <EuiFieldText
            fullWidth
            value={text}
            placeholder={field.type === 'date' ? i18n.FIELD_DATE_PLACEHOLDER : undefined}
            isInvalid={Boolean(error)}
            maxLength={field.type === 'date' ? 64 : 2048}
            onChange={(event) => onChange(field.key, event.target.value)}
            data-test-subj={testSubj}
          />
        </EuiFormRow>
      );
    })}
  </>
);
TypeFields.displayName = 'TypeFields';
