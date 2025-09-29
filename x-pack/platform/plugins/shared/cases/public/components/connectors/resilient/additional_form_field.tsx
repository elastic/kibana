/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import moment, { type Moment } from 'moment';
import { EuiComboBox, type EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  CheckBoxField,
  DatePickerField,
  NumericField,
  TextAreaField,
  TextField,
  SelectField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { ResilientFieldMetadata } from './types';

export const AdditionalFormField = React.memo<{ field: ResilientFieldMetadata }>(({ field }) => {
  const path = field.name;
  const dataTestSubj = `resilientAdditionalField-${field.name}`;
  switch (field.input_type) {
    case 'text':
      return (
        <UseField<string>
          key={field.name}
          path={path}
          config={{ defaultValue: '', label: field.text }}
          component={TextField}
          euiFieldProps={{
            'data-test-subj': dataTestSubj,
          }}
        />
      );
    case 'textarea':
      return (
        <UseField<string>
          key={field.name}
          path={path}
          config={{ defaultValue: '', label: field.text }}
          component={TextAreaField}
          euiFieldProps={{
            'data-test-subj': dataTestSubj,
          }}
        />
      );
    case 'datetimepicker':
      return (
        <UseField<Moment>
          key={field.name}
          path={path}
          config={{ label: field.text }}
          defaultValue={moment()}
          component={DatePickerField}
          euiFieldProps={{
            'data-test-subj': dataTestSubj,
            showTimeSelect: true,
          }}
        />
      );
    case 'datepicker':
      return (
        <UseField<Moment>
          key={field.name}
          path={path}
          config={{ label: field.text }}
          defaultValue={moment()}
          component={DatePickerField}
          euiFieldProps={{
            'data-test-subj': dataTestSubj,
            showTimeSelect: false,
          }}
        />
      );
    case 'boolean':
      return (
        <UseField<boolean>
          key={field.name}
          path={path}
          config={{ label: field.text }}
          component={CheckBoxField}
          euiFieldProps={{
            'data-test-subj': dataTestSubj,
          }}
        />
      );
    case 'number':
      return (
        <UseField<number>
          key={field.name}
          path={path}
          config={{ label: field.text }}
          component={NumericField}
          euiFieldProps={{
            'data-test-subj': dataTestSubj,
          }}
        />
      );
    case 'select':
      return (
        <UseField<number>
          key={field.name}
          path={path}
          config={{ label: field.text }}
          component={SelectField}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': dataTestSubj,
              options: field.values
                ? field.values.map((val) => ({
                    label: val.label,
                    value: val.value,
                  }))
                : [],
              hasNoInitialSelection: true,
              fullWidth: true,
              disabled: false,
              isLoading: false,
            },
          }}
        />
      );
    case 'multiselect':
      return (
        <UseField<number[]> path={path} config={{ defaultValue: [] }}>
          {(_field) => {
            const onChangeComboBox = (changedOptions: Array<EuiComboBoxOptionOption<string>>) => {
              _field.setValue(changedOptions.map((option) => parseInt(option.value as string, 10)));
            };

            const selectedOptions = _field.value.map((val) => ({
              value: val.toString(),
              label:
                field.values?.find((type) => val.toString() === type.value.toString())?.label ?? '',
            }));

            const isInvalid = false;
            return (
              <EuiFormRow fullWidth label={field.text} isInvalid={isInvalid}>
                <EuiComboBox
                  isInvalid={isInvalid}
                  data-test-subj="incidentTypeComboBox"
                  fullWidth
                  isClearable={true}
                  isDisabled={false}
                  isLoading={false}
                  onChange={onChangeComboBox}
                  options={
                    field.values
                      ? field.values.map((val) => ({
                          label: val.label,
                          value: val.value.toString(),
                        }))
                      : []
                  }
                  selectedOptions={selectedOptions}
                />
              </EuiFormRow>
            );
          }}
        </UseField>
      );
  }
  return null;
});

AdditionalFormField.displayName = 'AdditionalFormField';
