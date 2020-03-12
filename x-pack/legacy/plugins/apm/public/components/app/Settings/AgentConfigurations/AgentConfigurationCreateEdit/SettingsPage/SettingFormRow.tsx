/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiFieldNumber,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCode,
  EuiSpacer,
  EuiIconTip
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  amountAndUnitToString,
  amountAndUnitToObject
} from '../../../../../../../../../../plugins/apm/common/runtime_types/agent_configuration/amount_and_unit';
import {
  SettingDefinition,
  isValid
} from '../../../../../../../../../../plugins/apm/common/runtime_types/agent_configuration/config_setting_definitions';
import { SelectWithPlaceholder } from '../../../../../shared/SelectWithPlaceholder';

function FormRow({
  setting,
  value,
  onChange
}: {
  setting: SettingDefinition;
  value?: string;
  onChange: (key: string, value: string) => void;
}) {
  const defaultInputPlaceholder = i18n.translate(
    'xpack.apm.agentConfig.defaultInputPlaceholder',
    {
      defaultMessage: 'Set {settingsLabel}',
      values: { settingsLabel: setting.label }
    }
  );

  switch (setting.type) {
    case 'text': {
      return (
        <EuiFieldText
          placeholder={setting.placeholder || defaultInputPlaceholder}
          value={value || ''}
          onChange={e => onChange(setting.key, e.target.value)}
        />
      );
    }

    case 'integer': {
      return (
        <EuiFieldNumber
          placeholder={setting.placeholder || defaultInputPlaceholder}
          value={(value as any) || ''}
          min={setting.min}
          max={setting.max}
          onChange={e => onChange(setting.key, e.target.value)}
        />
      );
    }

    case 'select': {
      return (
        <SelectWithPlaceholder
          placeholder={setting.placeholder}
          options={setting.options}
          value={value}
          onChange={e => onChange(setting.key, e.target.value)}
        />
      );
    }

    case 'boolean': {
      return (
        <SelectWithPlaceholder
          placeholder={setting.placeholder}
          options={[{ text: 'true' }, { text: 'false' }]}
          value={value}
          onChange={e => onChange(setting.key, e.target.value)}
        />
      );
    }

    case 'amountAndUnit': {
      const { amount, unit } = amountAndUnitToObject(value ?? '');

      return (
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiFieldNumber
              placeholder={setting.placeholder || defaultInputPlaceholder}
              value={amount as any}
              onChange={e =>
                onChange(
                  setting.key,
                  amountAndUnitToString({ amount: e.target.value, unit })
                )
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SelectWithPlaceholder
              placeholder={i18n.translate('xpack.apm.unitLabel', {
                defaultMessage: 'Select unit'
              })}
              value={unit}
              options={setting.units.map(text => ({ text }))}
              onChange={e =>
                onChange(
                  setting.key,
                  amountAndUnitToString({ amount, unit: e.target.value })
                )
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    default:
      // @ts-ignore
      throw new Error(`Unknown type "${setting.type}"`);
  }
}

export function SettingFormRow({
  isUnsaved,
  setting,
  value,
  onChange
}: {
  isUnsaved: boolean;
  setting: SettingDefinition;
  value?: string;
  onChange: (key: string, value: string) => void;
}) {
  const isInvalid = value != null && value !== '' && !isValid(setting, value);

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <h3>
          {setting.label}{' '}
          {isUnsaved && (
            <EuiIconTip type={'dot'} color={'warning'} content={'Unsaved'} />
          )}
        </h3>
      }
      description={
        <>
          {setting.helpText}

          {setting.defaultValue && (
            <>
              <EuiSpacer />
              <EuiCode>Default: {setting.defaultValue}</EuiCode>
            </>
          )}
        </>
      }
    >
      <EuiFormRow
        label={setting.key}
        error={setting.validationError}
        isInvalid={isInvalid}
      >
        <FormRow onChange={onChange} setting={setting} value={value} />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
}
