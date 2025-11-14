/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFieldPassword,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayout,
  EuiFormRow,
  EuiSwitch,
  EuiTextArea,
  EuiFieldNumber,
} from '@elastic/eui';

import { isEmpty } from 'lodash/fp';
import { FieldType, type Map, type ConfigEntryView } from '../../types/types';
import {
  ADD_LABEL,
  DELETE_LABEL,
  HEADERS_KEY_LABEL,
  HEADERS_VALUE_LABEL,
  HEADERS_SWITCH_LABEL,
} from '../../translations';
import { ensureBooleanType, ensureCorrectTyping, ensureStringType } from './configuration_utils';

interface ConfigurationFieldProps {
  configEntry: ConfigEntryView;
  isLoading: boolean;
  setConfigValue: (value: number | string | boolean | null | Map) => void;
  isEdit?: boolean;
  isPreconfigured?: boolean;
}

interface ConfigInputFieldProps {
  configEntry: ConfigEntryView;
  isLoading: boolean;
  validateAndSetConfigValue: (value: string | boolean | Map) => void;
  isEdit?: boolean;
  isPreconfigured?: boolean;
}

const KEY_INDEX = 0;
const VALUE_INDEX = 1;

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
    <EuiFormControlLayout
      isDisabled={isLoading || (isEdit && !updatable) || isPreconfigured}
      fullWidth
      clear={{
        onClick: (e) => {
          validateAndSetConfigValue('');
          setInnerValue('');
        },
      }}
    >
      <EuiFieldNumber
        min={0}
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
    </EuiFormControlLayout>
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

const emptyHeaders: Map = { '': '' };

export const ConfigInputMapField: React.FC<ConfigInputFieldProps> = ({
  configEntry,
  isLoading,
  validateAndSetConfigValue,
  isEdit = false,
}) => {
  const { isValid, value, default_value: defaultValue, key, updatable } = configEntry;
  const [showHeaderInputs, setShowHeaderInputs] = useState<boolean>(false);
  const [headers, setHeaders] = useState<Map>((value as Map) ?? defaultValue ?? emptyHeaders);

  const onChange = (e: EuiSwitchEvent) => {
    setShowHeaderInputs(e.target.checked);
    // clear headers if unchecking
    if (e.target.checked === false) {
      setHeaders(emptyHeaders);
      validateAndSetConfigValue('');
    }
  };

  const iterableHeaders: [string, string][] = Object.entries(headers);

  const handleHeaderChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    headerIndex: number,
    elementIndex: number
  ) => {
    setHeaders((prevHeaders) => {
      const newHeaders = [...Object.entries(prevHeaders)];
      newHeaders[headerIndex][elementIndex] = e.target.value;
      const headersObj = Object.fromEntries(newHeaders);
      validateAndSetConfigValue(headersObj);
      return headersObj;
    });
  };

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="s" data-test-subj={'config-field-map-type'}>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            data-test-subj={`${key}-switch-${showHeaderInputs ? 'checked' : 'unchecked'}`}
            label={HEADERS_SWITCH_LABEL}
            checked={showHeaderInputs}
            onChange={(e) => onChange(e)}
          />
        </EuiFlexItem>
        {showHeaderInputs
          ? iterableHeaders.map((header, index) => (
              <EuiFlexItem key={`${key}-header-${index}`}>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem>
                    <EuiFormRow label={HEADERS_KEY_LABEL}>
                      <EuiFieldText
                        data-test-subj={`${key}-key-${index}`}
                        isInvalid={!isValid}
                        disabled={isLoading || (isEdit && !updatable)}
                        value={header[0]}
                        onChange={(e) => {
                          handleHeaderChange(e, index, KEY_INDEX);
                        }}
                        aria-label={HEADERS_KEY_LABEL}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow label={HEADERS_VALUE_LABEL}>
                      <EuiFieldText
                        data-test-subj={`${key}-value-${index}`}
                        disabled={isLoading || (isEdit && !updatable)}
                        value={header[1]}
                        onChange={(e) => {
                          handleHeaderChange(e, index, VALUE_INDEX);
                        }}
                        aria-label={HEADERS_VALUE_LABEL}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      disabled={isLoading || (isEdit && !updatable)}
                      display="base"
                      color="danger"
                      css={{ marginTop: '22px' }}
                      onClick={() => {
                        const newHeaders = iterableHeaders.toSpliced(index, 1);
                        const headersObj = Object.fromEntries(newHeaders);
                        setHeaders(headersObj);
                        validateAndSetConfigValue(headersObj);
                      }}
                      iconType="minusInCircle"
                      aria-label={DELETE_LABEL}
                      data-test-subj={`${key}-delete-button-${index}`}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            ))
          : null}
        <EuiFlexItem grow={false}>
          <span>
            <EuiButton
              size="s"
              disabled={
                isLoading ||
                (isEdit && !updatable) ||
                (!isEdit &&
                  iterableHeaders.length === 1 &&
                  (iterableHeaders[0][0] === '' || iterableHeaders[0][1] === ''))
              }
              iconType="plusInCircle"
              onClick={() => {
                const newHeaders = [...iterableHeaders, ['', '']];
                setHeaders(Object.fromEntries(newHeaders));
              }}
              data-test-subj={`${key}-add-button`}
              aria-label={ADD_LABEL}
            >
              {ADD_LABEL}
            </EuiButton>
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
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
  const validateAndSetConfigValue = (value: number | string | boolean | Map) => {
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

    case FieldType.MAP:
      return (
        <ConfigInputMapField
          isEdit={isEdit}
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
