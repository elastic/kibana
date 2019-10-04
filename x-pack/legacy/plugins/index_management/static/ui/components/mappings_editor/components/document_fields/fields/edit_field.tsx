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
  // EuiButton,
  // EuiFlexGroup,
  // EuiFlexItem,
} from '@elastic/eui';

// import {
// useForm,
// Form,
// TextField,
// SelectField,
// UseField,
// fieldValidators,
// } from '../../../shared_imports';
// import { FIELD_TYPES_OPTIONS } from '../../../constants';
// import { useDispatch } from '../../../mappings_state';
import { Field } from '../../../types';

// const formWrapper = (props: any) => <form {...props} />;

interface Props {
  field?: Field;
}

export const EditField = ({ field }: Props) => {
  // const { form } = useForm<Field>({ defaultValue: field });
  // const dispatch = useDispatch();

  // const submitForm = async (e?: React.FormEvent) => {
  //   if (e) {
  //     e.preventDefault();
  //   }
  //   const { isValid, data } = await form.submit();
  //   if (isValid) {
  //     dispatch({ type: 'field.add', value: data });
  //     form.reset();
  //   }
  // };

  // const cancel = () => {
  //   dispatch({ type: 'documentField.changeStatus', value: 'idle' });
  // };

  return (
    <EuiFlyout
      data-test-subj="autoFollowPatternDetail"
      // onClose={closeDetailPanel}
      onClose={() => undefined}
      aria-labelledby="autoFollowPatternDetailsFlyoutTitle"
      size="m"
      maxWidth={400}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m" data-test-subj="title">
          <h2>Edit field</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>Content of the flyout</EuiFlyoutBody>
    </EuiFlyout>
  );
};

/* <Form form={form} style={{ padding: '20px 0' }} FormWrapper={formWrapper} onSubmit={submitForm}>
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
          <EuiButton onClick={submitForm} type="submit">
            Add
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton onClick={cancel}>Done</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Form> */
