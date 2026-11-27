/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiComboBox,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';

import type { useComboInput, useInput, useSwitchInput } from '../../../../hooks';

import type { OtelSpec } from './otlp_spec';
import { OtlpSpecLinks } from './otlp_spec';

/** The fields of the OTLP output settings. */

/**
 * The errors of a setting: the ones of its input, and `otherErrors` that depend on other settings,
 * such as two settings that cannot be set together.
 */
export const getSettingErrors = (inputErrors: string[] | undefined, otherErrors?: string[]) => {
  const errors = [...(inputErrors ?? []), ...(otherErrors ?? [])];
  return errors.length ? errors : undefined;
};

export const OtlpTextSetting: React.FunctionComponent<{
  label: React.ReactNode;
  helpText: React.ReactNode;
  input: ReturnType<typeof useInput>;
  testSubj: string;
  placeholder?: string;
  otherErrors?: string[];
}> = ({ label, helpText, input, testSubj, placeholder, otherErrors }) => {
  const errors = getSettingErrors(input.errors, otherErrors);
  return (
    <EuiFormRow fullWidth label={label} helpText={helpText} isInvalid={!!errors} error={errors}>
      <EuiFieldText
        fullWidth
        data-test-subj={`settingsOutputsFlyout.${testSubj}`}
        placeholder={placeholder}
        {...input.props}
        isInvalid={!!errors}
        // validate when leaving the field, not only on save
        onBlur={() => input.validate()}
      />
    </EuiFormRow>
  );
};

export const OtlpTextAreaSetting: React.FunctionComponent<{
  label: React.ReactNode;
  helpText: React.ReactNode;
  input: ReturnType<typeof useInput>;
  testSubj: string;
  placeholder?: string;
  otherErrors?: string[];
}> = ({ label, helpText, input, testSubj, placeholder, otherErrors }) => {
  const errors = getSettingErrors(input.errors, otherErrors);
  return (
    <EuiFormRow fullWidth label={label} helpText={helpText} isInvalid={!!errors} error={errors}>
      <EuiTextArea
        fullWidth
        rows={5}
        data-test-subj={`settingsOutputsFlyout.${testSubj}`}
        placeholder={placeholder}
        {...input.props}
        isInvalid={!!errors}
        onBlur={() => input.validate()}
      />
    </EuiFormRow>
  );
};

/**
 * A list of values picked from `options`, which can be grouped. A stored value that is not an
 * option stays selected, so its error can be seen and the value removed.
 */
export const OtlpComboBoxSetting: React.FunctionComponent<{
  label: React.ReactNode;
  helpText: React.ReactNode;
  input: ReturnType<typeof useComboInput>;
  testSubj: string;
  options: Array<EuiComboBoxOptionOption<string>>;
  placeholder?: string;
  otherErrors?: string[];
}> = ({ label, helpText, input, testSubj, options, placeholder, otherErrors }) => {
  const errors = getSettingErrors(
    input.props.errors?.map(({ message }) => message),
    otherErrors
  );
  return (
    <EuiFormRow fullWidth label={label} helpText={helpText} isInvalid={!!errors} error={errors}>
      <EuiComboBox
        fullWidth
        data-test-subj={`settingsOutputsFlyout.${testSubj}`}
        placeholder={placeholder}
        isDisabled={input.props.disabled}
        isInvalid={!!errors}
        options={options}
        selectedOptions={input.value.map((value) => ({ label: value }))}
        onChange={(selected) => input.props.onChange(selected.map(({ label: value }) => value))}
        onBlur={() => input.validate()}
      />
    </EuiFormRow>
  );
};

export const OtlpSwitchSetting: React.FunctionComponent<{
  label: React.ReactNode;
  helpText: React.ReactNode;
  input: ReturnType<typeof useSwitchInput>;
  testSubj: string;
}> = ({ label, helpText, input, testSubj }) => (
  <EuiFormRow fullWidth helpText={helpText} {...input.formRowProps}>
    <EuiSwitch
      label={label}
      data-test-subj={`settingsOutputsFlyout.${testSubj}`}
      {...input.props}
    />
  </EuiFormRow>
);

export const OtlpSelectSetting: React.FunctionComponent<{
  label: React.ReactNode;
  helpText: React.ReactNode;
  input: ReturnType<typeof useInput>;
  testSubj: string;
  options: Array<{ value: string; text: string }>;
  error?: string | string[];
}> = ({ label, helpText, input, testSubj, options, error }) => (
  <EuiFormRow fullWidth label={label} helpText={helpText} isInvalid={!!error} error={error}>
    <EuiSelect
      fullWidth
      data-test-subj={`settingsOutputsFlyout.${testSubj}`}
      {...input.props}
      isInvalid={!!error}
      options={options}
    />
  </EuiFormRow>
);

/** The specs of a section of settings, shown once at its top. */
export const OtlpSettingsSpecs: React.FunctionComponent<{ specs: OtelSpec[] }> = ({ specs }) => (
  <>
    <EuiText size="xs" color="subdued">
      <OtlpSpecLinks specs={specs} />
    </EuiText>
    <EuiSpacer size="m" />
  </>
);

/** A group of related settings within a section, such as the connection settings. */
export const OtlpSettingsGroup: React.FunctionComponent<{
  title: React.ReactNode;
  testSubj: string;
  children: React.ReactNode;
}> = ({ title, testSubj, children }) => (
  <div data-test-subj={`settingsOutputsFlyout.${testSubj}`}>
    <EuiTitle size="xxs">
      <h4>{title}</h4>
    </EuiTitle>
    <EuiSpacer size="s" />
    {children}
    <EuiSpacer size="m" />
  </div>
);
