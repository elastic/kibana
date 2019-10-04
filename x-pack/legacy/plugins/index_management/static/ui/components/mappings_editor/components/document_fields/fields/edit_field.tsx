/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

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
import { Field, NormalizedField } from '../../../types';
import { validateUniqueName } from '../../../lib';

const formWrapper = (props: any) => <form {...props} />;

interface Props {
  field: NormalizedField;
}

export const EditField = ({ field }: Props) => {
  const { form } = useForm<Field>({ defaultValue: field.source });
  const { fields } = useState();
  const dispatch = useDispatch();

  const exitEdit = () => {
    dispatch({ type: 'documentField.changeStatus', value: 'idle' });
  };

  const submitForm = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const { isValid, data } = await form.submit();
    if (isValid) {
      dispatch({ type: 'field.edit', value: data });
      exitEdit();
    }
  };

  const cancel = () => {
    exitEdit();
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
      validator: validateUniqueName(fields, field.source.name, field.parentId),
    },
  ];

  const renderTempForm = () => (
    <Form form={form} style={{ padding: '20px 0' }} FormWrapper={formWrapper} onSubmit={submitForm}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <UseField path="name" config={{ validations: nameValidations }} component={TextField} />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            path="type"
            component={SelectField}
            componentProps={{
              euiFieldProps: {
                options: FIELD_TYPES_OPTIONS,
              },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiButton onClick={submitForm} type="submit">
            Update
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton onClick={cancel}>Cancel</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Form>
  );

  return (
    <EuiFlyout
      data-test-subj="mappingsEditorFieldEdit"
      onClose={exitEdit}
      aria-labelledby="mappingsEditorFieldEditTitle"
      size="m"
      maxWidth={400}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2>Edit field</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{renderTempForm()}</EuiFlyoutBody>
    </EuiFlyout>
  );
};
