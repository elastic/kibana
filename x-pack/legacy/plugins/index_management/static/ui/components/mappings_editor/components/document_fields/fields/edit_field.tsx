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
  FieldConfig,
} from '../../../shared_imports';
import { FIELD_TYPES_OPTIONS, PARAMETERS_DEFINITION } from '../../../constants';
import { useState, useDispatch } from '../../../mappings_state';
import { Field, NormalizedField, ParameterName } from '../../../types';
import { validateUniqueName } from '../../../lib';
import { UpdateFieldProvider, UpdateFieldFunc } from './update_field_provider';

const formWrapper = (props: any) => <form {...props} />;

const getFieldConfig = (param: ParameterName): FieldConfig =>
  PARAMETERS_DEFINITION[param].fieldConfig || {};

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

  const getSubmitForm = (updateField: UpdateFieldFunc) => async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const { isValid, data } = await form.submit();
    if (isValid) {
      updateField({ ...field, source: data });
    }
  };

  const cancel = () => {
    exitEdit();
  };

  const { validations, ...rest } = getFieldConfig('name');
  const nameConfig: FieldConfig = {
    ...rest,
    validations: [
      ...validations!,
      {
        validator: validateUniqueName(fields, field.source.name, field.parentId),
      },
    ],
  };

  const renderTempForm = () => (
    <UpdateFieldProvider>
      {updateField => (
        <Form
          form={form}
          style={{ padding: '20px 0' }}
          FormWrapper={formWrapper}
          onSubmit={getSubmitForm(updateField)}
        >
          <EuiFlexGroup>
            <EuiFlexItem>
              <UseField path="name" config={nameConfig} component={TextField} />
            </EuiFlexItem>
            <EuiFlexItem>
              <UseField
                path="type"
                config={getFieldConfig('type')}
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
              <EuiButton onClick={getSubmitForm(updateField)} type="submit">
                Update
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton onClick={cancel}>Cancel</EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Form>
      )}
    </UpdateFieldProvider>
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
