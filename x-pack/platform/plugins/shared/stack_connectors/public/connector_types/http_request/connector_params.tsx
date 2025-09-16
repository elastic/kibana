/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiFieldText, EuiTextArea, EuiSelect } from '@elastic/eui';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';

import type { HttpRequestActionParams } from '.';

/*
const sampleForm = [
  {
    "name": "summary",
    "label": "Summary",
    "type": "text",
    "required": true,
    "placeholder": "Enter a short summary"
  },
  {
    "name": "description",
    "label": "Description",
    "type": "textarea",
    "required": false,
    "placeholder": "Enter detailed description"
  },
  {
    "name": "priority",
    "label": "Priority",
    "type": "select",
    "required": true,
    "options": [
      { "value": "high", "text": "High" },
      { "value": "medium", "text": "Medium" },
      { "value": "low", "text": "Low" }
    ]
  },
  {
    "name": "assignee",
    "label": "Assignee",
    "type": "text",
    "required": false,
    "placeholder": "Assign to user"
  }
];
*/

interface FieldDefinition {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  options?: { value: string; text: string }[];
}

interface FormDefinition {
  fields: FieldDefinition[];
}

interface JsonFormGeneratorProps {
  form: FormDefinition;
  values: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

function getCompoent(
  field: FieldDefinition,
  value: string | number | undefined,
  onChange: JsonFormGeneratorProps['onChange']
) {
  switch (field.type) {
    case 'textarea':
      return (
        <EuiTextArea
          fullWidth={true}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.name, e.target.value)}
        />
      );
    case 'select':
      return (
        <EuiSelect
          fullWidth={true}
          options={field.options || []}
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
        />
      );
    case 'text':
    default:
      return (
        <EuiFieldText
          fullWidth={true}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.name, e.target.value)}
        />
      );
  }
}

export const jsonFormGenerator: React.FC<JsonFormGeneratorProps> = ({ form, values, onChange }) => {
  return (
    <>
      {form.fields.map((field) => {
        const value = values[field.name] ?? '';

        return (
          <EuiFormRow fullWidth label={field.label}>
            {getCompoent(field, value, onChange)}
          </EuiFormRow>
        );
      })}
    </>
  );
};

const HttpRequestParamsFields: React.FunctionComponent<
  ActionParamsProps<HttpRequestActionParams>
> = ({ actionParams, editAction, index, messageVariables, errors, actionConnector }) => {
  const { body } = actionParams;

  return jsonFormGenerator({
    form: {
      fields: actionConnector.config.paramFields,
    },
    values: body ? JSON.parse(body) : {},
    onChange: (name, val) => editAction(name, val, 0),
  });
};

// eslint-disable-next-line import/no-default-export
export { HttpRequestParamsFields as default };
