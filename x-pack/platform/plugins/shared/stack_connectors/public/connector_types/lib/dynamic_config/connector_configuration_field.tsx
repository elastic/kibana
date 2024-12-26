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
import { ConfigEntryView, FieldType } from '../../../../common/dynamic_config/types';
import {
  ensureBooleanType,
  ensureCorrectTyping,
  ensureStringType,
} from './connector_configuration_utils';

interface ConnectorConfigurationFieldProps {
  configEntry: ConfigEntryView;
  isLoading: boolean;
  setConfigValue: (value: number | string | boolean | null) => void;
}

interface ConfigInputFieldProps {
  configEntry: ConfigEntryView;
  isLoading: boolean;
  validateAndSetConfigValue: (value: string | boolean) => void;
}
export const ConfigInputField: React.FC<ConfigInputFieldProps> = ({
  configEntry,
  isLoading,
  validateAndSetConfigValue,
}) => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { isValid, value, default_value, key } = configEntry;
  const [innerValue, setInnerValue] = useState(
    !value || value.toString().length === 0 ? default_value : value
  );

  useEffect(() => {
    setInnerValue(!value || value.toString().length === 0 ? default_value : value);
  }, [default_value, value]);
  return (
    <EuiFieldText
      disabled={isLoading}
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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { label, value, default_value, key } = configEntry;
  const [innerValue, setInnerValue] = useState(value ?? default_value);
  useEffect(() => {
    setInnerValue(value ?? default_value);
  }, [default_value, value]);
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
}) => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { isValid, value, default_value, key } = configEntry;
  const [innerValue, setInnerValue] = useState(value ?? default_value);
  useEffect(() => {
    setInnerValue(value ?? default_value);
  }, [default_value, value]);
  return (
    <EuiTextArea
      disabled={isLoading}
      fullWidth
      data-test-subj={`${key}-textarea`}
      // ensures placeholder shows up when value is empty string
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
}) => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { isValid, value, default_value, key } = configEntry;
  const [innerValue, setInnerValue] = useState(value ?? default_value);
  useEffect(() => {
    setInnerValue(!value || value.toString().length === 0 ? default_value : value);
  }, [default_value, value]);
  return (
    <EuiFieldNumber
      fullWidth
      disabled={isLoading}
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

export const ConnectorConfigurationField: React.FC<ConnectorConfigurationFieldProps> = ({
  configEntry,
  isLoading,
  setConfigValue,
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
        />
      );
  }
};
