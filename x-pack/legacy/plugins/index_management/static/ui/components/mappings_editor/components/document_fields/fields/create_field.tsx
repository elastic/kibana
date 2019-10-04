/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import {
  useForm,
  Form,
  TextField,
  SelectField,
  UseField,
  fieldValidators,
} from '../../../shared_imports';
import { FIELD_TYPES_OPTIONS } from '../../../constants';
import { useState, useDispatch } from '../../../mappings_state';
import { Field } from '../../../types';
import { validateUniqueName } from '../../../lib';

const formWrapper = (props: any) => <form {...props} />;

export const CreateField = () => {
  const { form } = useForm<Field>();
  const {
    documentFields: { fieldToAddFieldTo },
    fields,
  } = useState();
  const dispatch = useDispatch();

  const submitForm = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const { isValid, data } = await form.submit();
    if (isValid) {
      dispatch({ type: 'field.add', value: data });
      form.reset();
    }
  };

  const cancel = () => {
    dispatch({ type: 'documentField.changeStatus', value: 'idle' });
  };

  const nameValidations = [
    {
      validator: fieldValidators.emptyField('Cannot be empty'),
    },
    {
      validator: fieldValidators.containsCharsField({
        chars: '.',
        message: 'Cannot contain a dot (.)',
      }),
    },
    {
      validator: validateUniqueName(fields, undefined, fieldToAddFieldTo),
    },
  ];

  return (
    <Form form={form} style={{ padding: '20px 0' }} FormWrapper={formWrapper} onSubmit={submitForm}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <UseField path="name" config={{ validations: nameValidations }} component={TextField} />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            path="type"
            defaultValue="text"
            component={SelectField}
            componentProps={{
              euiFieldProps: {
                options: FIELD_TYPES_OPTIONS,
              },
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton onClick={submitForm} type="submit">
            Add
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton onClick={cancel}>Cancel</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Form>
  );
};
