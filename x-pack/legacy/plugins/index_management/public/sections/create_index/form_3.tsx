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
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiComboBoxOptionProps,
} from '@elastic/eui';
import { useForm, FormConfig, FieldConfig, Field as FieldType } from 'ui/forms/use_form';
import { FormRow, UseField, Field } from 'ui/forms/components';

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

export const Form3 = () => {
  const onSubmit: FormConfig<MyForm>['onSubmit'] = (formData, isValid) => {
    console.log('Submitting form...');
    console.log('Form data:', formData);
    console.log('Is form valid:', isValid);
  };

  const { form } = useForm<MyForm>({ onSubmit, schema: formSchema });

  const onAddValueToCombo = (field: FieldType) => async (value: string) => {
    const { isValid } = await field.validate({ value });

    if (!isValid) {
      // There is an issue with the ComboBox, and we need to wrap the update inside a setTimeout
      // see comment in "Field" component.
      setTimeout(() => {
        field.setValue(field.value as string[]);
      });
      return;
    }

    const newValue = [...(field.value as string[]), value];

    setTimeout(() => {
      field.setValue(newValue);
    });
  };

  const onComboUpdate = (field: FieldType) => (options: EuiComboBoxOptionProps[]) => {
    field.setValue(options.map(option => option.label));
  };

  const onSearchComboUpdate = (field: FieldType) => (value: string) => {
    if (value) {
      field.clearErrors('arrayItem');
    }
  };

  return (
    <form noValidate>
      <EuiTitle size="m">
        <h2>3. Advanced usage</h2>
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
                  onChange={e => {
                    field.clearErrors('invalidIndexName');
                    field.onChange(e);
                  }}
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

      <FormRow
        title="Combobox with validation"
        description="Here we have validation _before_ adding a value to the comboBox array"
      >
        <UseField path="comboBoxFieldWithValidation" form={form}>
          {field => {
            // Errors for the field
            const errorsField = form.isSubmitted ? field.getErrorsMessages() : '';

            // Errors of an invalid array item that the user tries to add
            const errorsArrayItem = field.getErrorsMessages('arrayItem');

            const isInvalid = field.errors.length
              ? form.isSubmitted || errorsArrayItem !== null
              : false;

            // Concatenate error messages.
            const error =
              errorsField && errorsArrayItem
                ? `${errorsField}, ${errorsArrayItem}`
                : errorsField
                ? errorsField
                : errorsArrayItem;

            return (
              <EuiFormRow
                label={field.label}
                helpText={field.helpText}
                error={error}
                isInvalid={isInvalid}
                fullWidth
              >
                <EuiComboBox
                  noSuggestions
                  placeholder="Type and then hit ENTER"
                  selectedOptions={(field.value as any[]).map(v => ({ label: v }))}
                  onCreateOption={onAddValueToCombo(field)}
                  onChange={onComboUpdate(field)}
                  onSearchChange={onSearchComboUpdate(field)}
                  fullWidth
                />
              </EuiFormRow>
            );
          }}
        </UseField>
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
