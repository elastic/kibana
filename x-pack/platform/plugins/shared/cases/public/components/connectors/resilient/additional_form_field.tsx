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
  type EuiFormRowProps,
  EuiLink,
  EuiText,
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
import { REMOVE_FIELD_BUTTON_LABEL } from './translations';

interface AdditionalFieldProps {
  path: string;
  label: string;
  labelAppend: EuiFormRowProps['labelAppend'];
  field: ResilientFieldMetadata;
  'data-test-subj': string;
}

const RemoveField = React.memo<{
  field: ResilientFieldMetadata;
  onRemoveField: (fieldName: string) => void;
}>(({ field, onRemoveField }) => {
  const onClick = useCallback(() => {
    onRemoveField(field.name);
  }, [onRemoveField, field.name]);
  return (
    <EuiText size="xs">
      <EuiLink onClick={onClick} aria-label={REMOVE_FIELD_BUTTON_LABEL}>
        {REMOVE_FIELD_BUTTON_LABEL}
      </EuiLink>
    </EuiText>
  );
});
RemoveField.displayName = 'RemoveField';

const AdditionalGenericField = React.memo<
  AdditionalFieldProps & { Component: UseFieldProps<unknown>['component'] }
>(({ path, label, labelAppend, 'data-test-subj': dataTestSubj, Component }) => {
  const fieldProps = useMemo(() => {
    return {
      config: { defaultValue: '', label },
      componentProps: {
        labelAppend,
        euiFieldProps: {
          display: 'center',
          'data-test-subj': dataTestSubj,
        },
      },
    };
  }, [label, labelAppend, dataTestSubj]);
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
  ({ path, label, labelAppend, 'data-test-subj': dataTestSubj, showTimeSelect }) => {
    const fieldProps = useMemo(() => {
      return {
        config: { label },
        defaultValue: moment(),
        componentProps: {
          labelAppend,
          euiFieldProps: {
            'data-test-subj': dataTestSubj,
            showTimeSelect,
          },
        },
      };
    }, [label, labelAppend, dataTestSubj, showTimeSelect]);
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
  ({ path, label, labelAppend, 'data-test-subj': dataTestSubj, field }) => {
    const fieldProps = useMemo(() => {
      return {
        config: { label },
        componentProps: {
          labelAppend,
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
    }, [label, labelAppend, dataTestSubj, field]);
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
  labelAppend: EuiFormRowProps['labelAppend'];
  outerField: ResilientFieldMetadata;
  options: EuiComboBoxProps<string>['options'];
  'data-test-subj': string;
}
const AdditionalMultiSelectInnerField = React.memo<
  InnerFieldProps & {
    field: FieldHook<number[], number[]>;
  }
>(({ field, label, labelAppend, outerField, options, 'data-test-subj': dataTestSubj }) => {
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
    <EuiFormRow label={label} labelAppend={labelAppend} isInvalid={isInvalid}>
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
  ({ path, label, labelAppend, 'data-test-subj': dataTestSubj, field }) => {
    const fieldProps = useMemo(() => {
      const componentProps: InnerFieldProps = {
        label,
        labelAppend,
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
    }, [label, labelAppend, dataTestSubj, field]);
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
  onRemoveField: (fieldName: string) => void;
}>(({ field, onRemoveField }) => {
  const path = field.name;
  const dataTestSubj = `resilientAdditionalField-${field.name}`;
  const props: AdditionalFieldProps = useMemo(() => {
    return {
      path,
      label: field.text,
      labelAppend: <RemoveField onRemoveField={onRemoveField} field={field} />,
      field,
      'data-test-subj': dataTestSubj,
    };
  }, [path, field, dataTestSubj, onRemoveField]);
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
