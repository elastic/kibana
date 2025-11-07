/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import {
  TextAreaWithMessageVariables,
  TextFieldWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';

import type { HttpRequestActionParams } from '.';

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
  messageVariables: ActionParamsProps<HttpRequestActionParams>['messageVariables'];
  index: number;
}

function getCompoent(
  field: FieldDefinition,
  value: string | number | undefined,
  onChange: JsonFormGeneratorProps['onChange'],
  messageVariables: ActionParamsProps<HttpRequestActionParams>['messageVariables'],
  index: number
) {
  switch (field.type) {
    case 'textarea':
      return (
        <TextAreaWithMessageVariables
          index={index}
          editAction={onChange}
          label={field.label}
          messageVariables={messageVariables}
          paramsProperty={field.name}
          inputTargetValue={value?.toString()}
          isOptionalField={true}
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
        <TextFieldWithMessageVariables
          index={0}
          editAction={onChange}
          messageVariables={messageVariables}
          paramsProperty={field.name}
          inputTargetValue={value?.toString()}
        />
      );
  }
}

export const jsonFormGenerator: React.FC<JsonFormGeneratorProps> = ({
  form,
  values,
  onChange,
  messageVariables,
  index,
}) => {
  return (
    <>
      {form.fields.map((field) => {
        const value = values[field.name] ?? '';

        return (
          <EuiFormRow fullWidth label={field.type === 'textarea' ? '' : field.label}>
            {getCompoent(field, value, onChange, messageVariables, index)}
          </EuiFormRow>
        );
      })}
    </>
  );
};

const HttpRequestParamsFields: React.FunctionComponent<
  ActionParamsProps<HttpRequestActionParams>
> = ({ actionParams, editAction, index, messageVariables, errors, actionConnector }) => {
  return jsonFormGenerator({
    form: {
      fields: (actionConnector!.config.urlTemplateFields || []).concat(
        actionConnector!.config.paramFields
      ),
    },
    values: actionParams,
    onChange: (name, val) => editAction(name, val, 0),
    messageVariables,
    index,
  });
};

// eslint-disable-next-line import/no-default-export
export { HttpRequestParamsFields as default };
