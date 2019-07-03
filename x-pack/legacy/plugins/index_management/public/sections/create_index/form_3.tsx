/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable no-console */

import React from 'react';
import {
  EuiSpacer,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiTitle,
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { useForm, FormConfig, FieldConfig, UseField, UseArray } from 'ui/forms/hook_form_lib';
import { FormRow, Field } from 'ui/forms/components';

import { MyForm } from './types';
import { formSchema } from './form.schema';

const inlineConfig: FieldConfig<MyForm> = {
  label: 'This field has an inline config provided',
  helpText: 'Here is the help text of the field. (hint: "hello" is the valid value).',
  validations: [
    {
      validator: ({ value }) => {
        if (value === 'hello') {
          return;
        }
        return {
          code: 'ERR_CODE_CUSTOM',
          message: 'Value must be "hello"',
        };
      },
    },
  ],
};

export const Form3 = ({
  defaultValues,
  title,
}: {
  title?: string;
  defaultValues?: Record<string, any>;
}) => {
  const onSubmit: FormConfig<MyForm>['onSubmit'] = (formData, isValid) => {
    console.log('Submitting form...');
    console.log('Form data:', formData);
    console.log('Is form valid:', isValid);
  };

  const { form } = useForm<MyForm>({ onSubmit, schema: formSchema, defaultValues });

  return (
    <form noValidate>
      <EuiTitle size="m">
        <h2>{title ? title : '3. Advanced usage'}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />

      <UseField path="name" form={form}>
        {field => (
          <FormRow
            title="Name"
            description="This name field can completely be customized with any DOM element"
          >
            <Field field={field} />
          </FormRow>
        )}
      </UseField>

      <UseField
        path="nested.prop"
        form={form}
        render={FormRow}
        renderProps={{
          title: 'Nested prop',
          description: 'Description of the nested prop.',
        }}
      >
        {field => (
          <EuiDescribedFormGroup
            title={
              <EuiTitle size="l">
                <h4>Bigger title for some reason</h4>
              </EuiTitle>
            }
            description="Another customized example to show how flexible it can get. Although this is a lot of boilerplate to display a field."
            fullWidth
          >
            <EuiFormRow
              label={field.label}
              helpText={field.helpText}
              error={field.errors.length && field.errors[0].message}
              isInvalid={field.form.isSubmitted && field.errors.length > 0}
              fullWidth
            >
              <EuiFieldText
                isInvalid={field.form.isSubmitted && field.errors.length > 0}
                value={field.value as string}
                onChange={field.onChange}
                fullWidth
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        )}
      </UseField>

      <UseField path="indexName" form={form}>
        {field => {
          return (
            <FormRow
              title="Index name (async validation)"
              description="This field has an asynchronous validation. Try it!"
            >
              <EuiFormRow
                label={field.label}
                helpText={field.helpText}
                error={field.errors.length && field.errors[0].message}
                isInvalid={field.errors.length > 0}
                fullWidth
              >
                <EuiFieldText
                  isInvalid={field.errors.length > 0}
                  value={field.value as string}
                  onChange={field.onChange}
                  isLoading={field.isValidating}
                  fullWidth
                />
              </EuiFormRow>
            </FormRow>
          );
        }}
      </UseField>

      <FormRow
        title="Multiple fields in one Form row"
        description="This is an example of multiple fields on 1 form row"
      >
        <div>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <UseField path="comboBoxField" render={Field} form={form} />
            </EuiFlexItem>
            <EuiFlexItem>
              <UseField path="title" render={Field} form={form} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        <EuiFlexItem>
          <UseField path="field.not.on.schema" config={inlineConfig} render={Field} form={form} />
        </EuiFlexItem>
      </FormRow>

      <UseField
        path="comboBoxFieldWithValidation"
        form={form}
        render={FormRow}
        renderProps={{
          title: 'Combobox with validation',
          description:
            'We can see here how we have the validation _before_ adding an item to the comboBox array',
        }}
      />

      <FormRow title="Dynamic fields" description="Or how to dynamically add values to an array">
        <UseArray path="elastic.coWorkers" form={form}>
          {({ rows, addRow, removeRow }) => (
            <React.Fragment>
              <div>
                {rows.map(({ id, rowPath, isNew }, i) => (
                  <EuiFlexGroup gutterSize="s" key={id}>
                    <EuiFlexItem>
                      <UseField
                        path={rowPath + '.firstName'}
                        config={{ label: 'First name' }}
                        defaultValue={isNew ? '' : undefined}
                        render={Field}
                        form={form}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <UseField
                        path={rowPath + '.lastName'}
                        config={{ label: 'Last name' }}
                        defaultValue={isNew ? '' : undefined}
                        render={Field}
                        form={form}
                      />
                    </EuiFlexItem>
                    {i > 0 && (
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          color="danger"
                          onClick={() => removeRow(id)}
                          iconType="cross"
                          aria-label="Remove co-worker"
                        />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                ))}
              </div>
              <EuiSpacer size="m" />
              <div>
                <EuiButton color="secondary" iconType="check" onClick={addRow}>
                  Add co-worker
                </EuiButton>
              </div>
            </React.Fragment>
          )}
        </UseArray>
      </FormRow>

      <EuiSpacer size="m" />
      <EuiButton
        color="secondary"
        iconType="check"
        fill
        onClick={form.onSubmit}
        disabled={form.isSubmitting || (form.isSubmitted && !form.isValid)}
      >
        Submit form
      </EuiButton>
    </form>
  );
};
