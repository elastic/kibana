/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable no-console */

import React from 'react';
import { EuiSpacer, EuiTitle, EuiButton } from '@elastic/eui';
import {
  useForm,
  FormConfig,
  UseField,
} from '../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';
import { FormRow } from '../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/components';

import { MyForm } from './types';
import { formSchema } from './form.schema';

export const Form2 = () => {
  const onSubmit: FormConfig<MyForm>['onSubmit'] = (formData, isValid) => {
    console.log('Submitting form...');
    console.log('Form data:', formData);
    console.log('Is form valid:', isValid);
  };

  const { form } = useForm<MyForm>({ onSubmit, schema: formSchema });
  const countries = [{ value: 'US', text: 'United States' }, { value: 'ES', text: 'Spain' }];

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
        path="country"
        form={form}
        component={FormRow}
        componentProps={{
          title: 'Country',
          description: 'Not much to say about a field to select a country.',
          fieldProps: { options: countries },
        }}
      />
      <UseField
        path="name"
        form={form}
        component={FormRow}
        componentProps={{
          title: 'Name',
          description: 'Description of the name row.',
        }}
      />
      <UseField path="title" form={form} component={FormRow} componentProps={{ title: 'Title' }} />
      <UseField
        path="nested.prop"
        form={form}
        component={FormRow}
        componentProps={{
          title: 'Nested prop',
          description: 'Description of the nested.prop.',
        }}
      />
      <UseField
        path="numeric"
        form={form}
        component={FormRow}
        componentProps={{
          title: 'This is a numeric field',
        }}
      />
      <UseField
        path="doWeAgree"
        form={form}
        component={FormRow}
        componentProps={{
          title: 'This is a toggle field',
          description: 'If you activate it, great things will happen.',
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
