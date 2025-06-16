/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiAccordion,
  EuiFieldText,
  EuiFieldPassword,
  EuiSwitch,
  EuiTextArea,
  EuiFieldNumber,
} from '@elastic/eui';

import { isEmpty } from 'lodash/fp';
import { ConfigEntryView, FieldType } from '../../types/types';
import { ensureBooleanType, ensureCorrectTyping, ensureStringType } from './configuration_utils';

interface ConfigurationFieldProps {
  configEntry: ConfigEntryView;
  isLoading: boolean;
  setConfigValue: (value: number | string | boolean | null) => void;
  isEdit?: boolean;
  isPreconfigured?: boolean;
}

interface ConfigInputFieldProps {
  configEntry: ConfigEntryView;
  isLoading: boolean;
  validateAndSetConfigValue: (value: string | boolean) => void;
  isEdit?: boolean;
  isPreconfigured?: boolean;
}
export const ConfigInputField: React.FC<ConfigInputFieldProps> = ({
  configEntry,
  isLoading,
  validateAndSetConfigValue,
  isEdit,
}) => {
  const { isValid, value, default_value: defaultValue, key, updatable } = configEntry;
  const [innerValue, setInnerValue] = useState(
    !value || value.toString().length === 0 ? defaultValue : value
  );

  useEffect(() => {
    setInnerValue(!value || value.toString().length === 0 ? defaultValue : value);
  }, [defaultValue, value]);
  return (
    <EuiFieldText
      disabled={isLoading || (isEdit && !updatable)}
      data-test-subj={`${key}-input`}
      fullWidth
      value={ensureStringType(innerValue)}
      isInvalid={!isValid}
      onChange={(event) => {
        setInnerValue(event.target.value);
        validateAndSetConfigValue(event.target.value);
      }}
    />
  );
};

export const ConfigSwitchField: React.FC<ConfigInputFieldProps> = ({
  configEntry,
  isLoading,
  validateAndSetConfigValue,
}) => {
  const { label, value, default_value: defaultValue, key } = configEntry;
  const [innerValue, setInnerValue] = useState(value ?? defaultValue);
  useEffect(() => {
    setInnerValue(value ?? defaultValue);
  }, [defaultValue, value]);
  return (
    <EuiSwitch
      checked={ensureBooleanType(innerValue)}
      data-test-subj={`${key}-switch`}
      disabled={isLoading}
      label={<p>{label}</p>}
      onChange={(event) => {
        setInnerValue(event.target.checked);
        validateAndSetConfigValue(event.target.checked);
      }}
    />
  );
};

export const ConfigInputTextArea: React.FC<ConfigInputFieldProps> = ({
  isLoading,
  configEntry,
  validateAndSetConfigValue,
  isEdit,
}) => {
  const { isValid, value, default_value: defaultValue, key, updatable } = configEntry;
  const [innerValue, setInnerValue] = useState(value ?? defaultValue);
  useEffect(() => {
    setInnerValue(value ?? '');
  }, [defaultValue, value]);
  return (
    <EuiTextArea
      disabled={isLoading || (isEdit && !updatable)}
      fullWidth
      data-test-subj={`${key}-textarea`}
      value={ensureStringType(innerValue)}
      isInvalid={!isValid}
      onChange={(event) => {
        setInnerValue(event.target.value);
        validateAndSetConfigValue(event.target.value);
      }}
    />
  );
};

export const ConfigNumberField: React.FC<ConfigInputFieldProps> = ({
  configEntry,
  isLoading,
  validateAndSetConfigValue,
  isEdit,
  isPreconfigured,
}) => {
  const { isValid, value, default_value: defaultValue, key, updatable } = configEntry;
  const [innerValue, setInnerValue] = useState(value ?? defaultValue);
  useEffect(() => {
    setInnerValue(!value || value.toString().length === 0 ? defaultValue : value);
  }, [defaultValue, value]);
  return (
    <EuiFieldNumber
      fullWidth
      disabled={isLoading || (isEdit && !updatable) || isPreconfigured}
      data-test-subj={`${key}-number`}
      value={innerValue as number}
      isInvalid={!isValid}
      onChange={(event) => {
        const newValue = isEmpty(event.target.value) ? '0' : event.target.value;
        setInnerValue(newValue);
        validateAndSetConfigValue(newValue);
      }}
    />
  );
};

export const ConfigSensitiveTextArea: React.FC<ConfigInputFieldProps> = ({
  isLoading,
  configEntry,
  validateAndSetConfigValue,
}) => {
  const { key, label } = configEntry;
  return (
    <EuiAccordion id={key + '-accordion'} buttonContent={<p>{label}</p>}>
      <ConfigInputTextArea
        isLoading={isLoading}
        configEntry={configEntry}
        validateAndSetConfigValue={validateAndSetConfigValue}
      />
    </EuiAccordion>
  );
};

export const ConfigInputPassword: React.FC<ConfigInputFieldProps> = ({
  isLoading,
  configEntry,
  validateAndSetConfigValue,
}) => {
  const { value, key } = configEntry;
  const [innerValue, setInnerValue] = useState(value ?? null);
  useEffect(() => {
    setInnerValue(value ?? null);
  }, [value]);
  return (
    <>
      <EuiFieldPassword
        fullWidth
        disabled={isLoading}
        data-test-subj={`${key}-password`}
        type="dual"
        value={ensureStringType(innerValue)}
        onChange={(event) => {
          setInnerValue(event.target.value);
          validateAndSetConfigValue(event.target.value);
        }}
      />
    </>
  );
};

export const ConfigurationField: React.FC<ConfigurationFieldProps> = ({
  configEntry,
  isLoading,
  setConfigValue,
  isEdit,
  isPreconfigured,
}) => {
  const validateAndSetConfigValue = (value: number | string | boolean) => {
    setConfigValue(ensureCorrectTyping(configEntry.type, value));
  };

  const { key, type, sensitive } = configEntry;

  switch (type) {
    case FieldType.INTEGER:
      return (
        <ConfigNumberField
          key={key}
          isLoading={isLoading}
          configEntry={configEntry}
          validateAndSetConfigValue={validateAndSetConfigValue}
          isEdit={isEdit}
          isPreconfigured={isPreconfigured}
        />
      );

    case FieldType.BOOLEAN:
      return (
        <ConfigSwitchField
          isLoading={isLoading}
          configEntry={configEntry}
          validateAndSetConfigValue={validateAndSetConfigValue}
        />
      );

    default:
      return sensitive ? (
        <ConfigInputPassword
          isLoading={isLoading}
          configEntry={configEntry}
          validateAndSetConfigValue={validateAndSetConfigValue}
        />
      ) : (
        <ConfigInputField
          key={key}
          isLoading={isLoading}
          configEntry={configEntry}
          validateAndSetConfigValue={validateAndSetConfigValue}
          isEdit={isEdit}
        />
      );
  }
};
