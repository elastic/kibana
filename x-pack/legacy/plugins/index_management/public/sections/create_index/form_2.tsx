/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable no-console */

import React from 'react';
import { EuiSpacer, EuiTitle, EuiButton } from '@elastic/eui';
import { useForm, FormConfig } from 'ui/forms/use_form';
import { FormRow, UseField } from 'ui/forms/components';

import { MyForm } from './types';
import { formSchema } from './form.schema';

export const Form2 = () => {
  const onSubmit: FormConfig<MyForm>['onSubmit'] = (formData, isValid) => {
    console.log('Submitting form...');
    console.log('Form data:', formData);
    console.log('Is form valid:', isValid);
  };

  const { form } = useForm<MyForm>({ onSubmit, schema: formSchema });

  /**
   * NOTE: There is a bug in EUI, the EuiForm component renders
   * a "div" instead of a "form" element.
   * For that reason, we won't be using it in the POC
   */
  return (
    <form onSubmit={form.onSubmit} noValidate>
      <EuiTitle size="m">
        <h2>2. Using the "render" prop</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <UseField
        path="name"
        form={form}
        render={FormRow}
        renderProps={{
          title: 'Name',
          description: 'Description of the name row.',
        }}
      />
      <UseField
        path="nested.prop"
        form={form}
        render={FormRow}
        renderProps={{
          title: 'Nested prop',
          description: 'Description of the nested.prop.',
        }}
      />
      <UseField
        path="numeric"
        form={form}
        render={FormRow}
        renderProps={{
          title: 'This is a numeric field',
        }}
      />
      <EuiSpacer size="m" />
      <EuiButton
        color="secondary"
        iconType="check"
        type="submit"
        fill
        disabled={form.isSubmitting || (form.isSubmitted && !form.isValid)}
      >
        Submit form
      </EuiButton>
    </form>
  );
};
