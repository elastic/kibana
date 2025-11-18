/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import moment, { type Moment } from 'moment';
import {
  EuiComboBox,
  type EuiComboBoxOptionOption,
  EuiFormRow,
  type EuiComboBoxProps,
} from '@elastic/eui';
import {
  type FieldHook,
  UseField,
  type UseFieldProps,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  CheckBoxField,
  DatePickerField,
  NumericField,
  TextAreaField,
  TextField,
  SelectField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { ResilientFieldMetadata } from './types';

interface AdditionalFieldProps {
  path: string;
  label: string;
  field: ResilientFieldMetadata;
  'data-test-subj': string;
}

const AdditionalGenericField = React.memo<
  AdditionalFieldProps & { Component: UseFieldProps<unknown>['component'] }
>(({ path, label, 'data-test-subj': dataTestSubj, Component }) => {
  const fieldProps = useMemo(() => {
    return {
      config: { defaultValue: '', label },
      componentProps: {
        euiFieldProps: {
          display: 'center',
          'data-test-subj': dataTestSubj,
        },
      },
    };
  }, [label, dataTestSubj]);
  return (
    <UseField<string>
      path={path}
      config={fieldProps.config}
      component={Component}
      componentProps={fieldProps.componentProps}
    />
  );
});
AdditionalGenericField.displayName = 'AdditionalGenericField';

const AdditionalDateField = React.memo<AdditionalFieldProps & { showTimeSelect: boolean }>(
  ({ path, label, 'data-test-subj': dataTestSubj, showTimeSelect }) => {
    const fieldProps = useMemo(() => {
      return {
        config: { label },
        defaultValue: moment(),
        componentProps: {
          euiFieldProps: {
            'data-test-subj': dataTestSubj,
            showTimeSelect,
          },
        },
      };
    }, [label, dataTestSubj, showTimeSelect]);
    return (
      <UseField<Moment>
        path={path}
        config={fieldProps.config}
        defaultValue={fieldProps.defaultValue}
        component={DatePickerField}
        componentProps={fieldProps.componentProps}
      />
    );
  }
);
AdditionalDateField.displayName = 'AdditionalDateField';

const AdditionalSelectField = React.memo<AdditionalFieldProps>(
  ({ path, label, 'data-test-subj': dataTestSubj, field }) => {
    const fieldProps = useMemo(() => {
      return {
        config: { label },
        componentProps: {
          euiFieldProps: {
            'data-test-subj': dataTestSubj,
            hasNoInitialSelection: true,
            disabled: false,
            isLoading: false,
            options: field.values
              ? field.values.map((val) => ({
                  label: val.label,
                  value: val.value,
                }))
              : [],
          },
        },
      };
    }, [label, dataTestSubj, field]);
    return (
      <UseField<number>
        path={path}
        config={fieldProps.config}
        component={SelectField}
        componentProps={fieldProps.componentProps}
      />
    );
  }
);
AdditionalSelectField.displayName = 'AdditionalSelectField';

interface InnerFieldProps {
  label: string;
  outerField: ResilientFieldMetadata;
  options: EuiComboBoxProps<string>['options'];
  'data-test-subj': string;
}
const AdditionalMultiSelectInnerField = React.memo<
  InnerFieldProps & {
    field: FieldHook<number[], number[]>;
  }
>(({ field, label, outerField, options, 'data-test-subj': dataTestSubj }) => {
  const onChangeComboBox = useCallback(
    (changedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      field.setValue(changedOptions.map((option) => parseInt(option.value as string, 10)));
    },
    [field]
  );

  const selectedOptions = useMemo(() => {
    return field.value.map((val) => ({
      value: val.toString(),
      label:
        outerField.values?.find((type) => val.toString() === type.value.toString())?.label ?? '',
    }));
  }, [field.value, outerField.values]);

  const isInvalid = false;
  return (
    <EuiFormRow label={label} isInvalid={isInvalid}>
      <EuiComboBox
        isInvalid={isInvalid}
        data-test-subj={dataTestSubj}
        isClearable={true}
        isDisabled={false}
        isLoading={false}
        onChange={onChangeComboBox}
        options={options}
        selectedOptions={selectedOptions}
      />
    </EuiFormRow>
  );
});
AdditionalMultiSelectInnerField.displayName = 'AdditionalMultiSelectInnerField';

const AdditionalMultiSelectField = React.memo<AdditionalFieldProps>(
  ({ path, label, 'data-test-subj': dataTestSubj, field }) => {
    const fieldProps = useMemo(() => {
      const componentProps: InnerFieldProps = {
        label,
        outerField: field,
        options: field.values
          ? field.values.map((val) => ({
              label: val.label,
              value: val.value.toString(),
            }))
          : [],
        'data-test-subj': dataTestSubj,
      };
      return {
        config: { defaultValue: [] },
        componentProps,
      };
    }, [label, dataTestSubj, field]);
    return (
      <UseField<number[]>
        path={path}
        config={fieldProps.config}
        component={AdditionalMultiSelectInnerField}
        componentProps={fieldProps.componentProps}
      />
    );
  }
);
AdditionalMultiSelectField.displayName = 'AdditionalMultiSelectField';

export const AdditionalFormField = React.memo<{
  field: ResilientFieldMetadata;
}>(({ field }) => {
  const path = field.name;
  const dataTestSubj = `resilientAdditionalField-${field.name}`;
  const props: AdditionalFieldProps = useMemo(() => {
    return {
      path,
      label: field.text,
      field,
      'data-test-subj': dataTestSubj,
    };
  }, [path, field, dataTestSubj]);
  switch (field.input_type) {
    case 'text':
      return <AdditionalGenericField {...props} Component={TextField} />;
    case 'textarea':
      return <AdditionalGenericField {...props} Component={TextAreaField} />;
    case 'datetimepicker':
      return <AdditionalDateField {...props} showTimeSelect={true} />;
    case 'datepicker':
      return <AdditionalDateField {...props} showTimeSelect={false} />;
    case 'boolean':
      return <AdditionalGenericField {...props} Component={CheckBoxField} />;
    case 'number':
      return <AdditionalGenericField {...props} Component={NumericField} />;
    case 'select':
      return <AdditionalSelectField {...props} />;
    case 'multiselect':
      return <AdditionalMultiSelectField {...props} />;
  }
  return null;
});

AdditionalFormField.displayName = 'AdditionalFormField';
