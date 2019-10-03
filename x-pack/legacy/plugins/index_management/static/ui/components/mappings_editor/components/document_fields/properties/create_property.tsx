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
import { useDispatch } from '../../../mappings_state';
import { Property } from '../../../types';

export const CreateProperty = () => {
  const { form } = useForm<Property>();
  const dispatch = useDispatch();

  const saveProperty = async () => {
    const { isValid, data } = await form.submit();
    if (isValid) {
      dispatch({ type: 'property.add', value: data });
      form.reset();
    }
  };

  const cancel = () => {
    dispatch({ type: 'documentField.changeStatus', value: 'idle' });
  };

  return (
    <Form form={form} style={{ padding: '20px 0' }}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <UseField
            path="name"
            config={{ validations: [{ validator: fieldValidators.emptyField('Cannot be empty') }] }}
            component={TextField}
          />
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
          <EuiButton onClick={saveProperty}>Save</EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton onClick={cancel}>Cancel</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Form>
  );
};
