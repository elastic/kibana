/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable react-hooks/exhaustive-deps */
import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiTitle,
  EuiText
} from '@elastic/eui';
import React, { useState, useMemo, useEffect } from 'react';

interface Field {
  type: 'text';
  name: string;
  label: string;
  helpText: string;
  placeholder: string;
  required?: boolean;
}

export type FormType = Field[];

export const useForm = ({
  fields,
  title,
  subtitle
}: {
  fields: FormType;
  title?: string;
  subtitle?: string;
}) => {
  const [data, setData] = useState({});

  const syncData = (values: any) => {
    setData(values);
  };

  const Form = () => {
    const [formValues, setFormValues] = useState({});
    useEffect(() => {
      syncData(formValues);
    }, [formValues]);
    return (
      <>
        {title && (
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        )}
        {subtitle && <EuiText size="xs">{subtitle}</EuiText>}
        <EuiForm>
          {fields.map(field => {
            return (
              <EuiFormRow
                key={field.name}
                label={field.label}
                helpText={field.helpText}
              >
                <EuiFieldText
                  placeholder={field.placeholder}
                  name={field.name}
                  onChange={e => {
                    setFormValues(values => ({
                      ...values,
                      [field.name]: e.target.value
                    }));
                  }}
                />
              </EuiFormRow>
            );
          })}
        </EuiForm>
      </>
    );
  };

  return { ...data, Form: useMemo(() => Form, fields) };
};
