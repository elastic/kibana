/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import { EuiButtonEmpty, EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { useForm, Form, SelectField, UseField, FieldConfig } from '../../../shared_imports';
import { FIELD_TYPES_OPTIONS, PARAMETERS_DEFINITION } from '../../../constants';
import { useDispatch } from '../../../mappings_state';
import { Field, ParameterName } from '../../../types';
import { NameParameter } from '../field_parameters';

const formWrapper = (props: any) => <form {...props} />;

const getFieldConfig = (param: ParameterName): FieldConfig =>
  PARAMETERS_DEFINITION[param].fieldConfig || {};

interface Props {
  isCancelable?: boolean;
}

export const CreateField = React.memo(({ isCancelable = true }: Props) => {
  const { form } = useForm<Field>();
  const dispatch = useDispatch();

  useEffect(() => {
    const subscription = form.subscribe(updatedFieldForm => {
      dispatch({ type: 'fieldForm.update', value: updatedFieldForm });
    });

    return subscription.unsubscribe;
  }, [form]);

  const submitForm = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    const { isValid, data } = await form.submit();

    if (isValid) {
      form.reset();
      dispatch({ type: 'field.add', value: data });
    }
  };

  const cancel = () => {
    dispatch({ type: 'documentField.changeStatus', value: 'idle' });
  };

  return (
    <Form form={form} FormWrapper={formWrapper} onSubmit={submitForm}>
      <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <NameParameter />
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
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            {isCancelable && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={cancel}>Cancel</EuiButtonEmpty>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButton color="primary" fill onClick={submitForm} type="submit">
                Add
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Form>
  );
});
