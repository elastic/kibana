/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type { useInput, useSwitchInput } from '../../../../hooks';

import type { OtelSpec } from './otlp_spec';
import { OtlpSpecLinks } from './otlp_spec';

/** The fields of the OTLP output settings. */

export const OtlpTextSetting: React.FunctionComponent<{
  label: React.ReactNode;
  helpText: React.ReactNode;
  input: ReturnType<typeof useInput>;
  testSubj: string;
  placeholder?: string;
}> = ({ label, helpText, input, testSubj, placeholder }) => (
  <EuiFormRow fullWidth label={label} helpText={helpText} {...input.formRowProps}>
    <EuiFieldText
      fullWidth
      data-test-subj={`settingsOutputsFlyout.${testSubj}`}
      placeholder={placeholder}
      {...input.props}
      // validate when leaving the field, not only on save
      onBlur={() => input.validate()}
    />
  </EuiFormRow>
);

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
}> = ({ label, helpText, input, testSubj, options }) => (
  <EuiFormRow fullWidth label={label} helpText={helpText}>
    <EuiSelect
      fullWidth
      data-test-subj={`settingsOutputsFlyout.${testSubj}`}
      {...input.props}
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
