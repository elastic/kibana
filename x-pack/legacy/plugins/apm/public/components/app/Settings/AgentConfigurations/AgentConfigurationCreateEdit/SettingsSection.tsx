/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiTitle,
  EuiSpacer,
  EuiFieldNumber
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SelectWithPlaceholder } from '../../../../shared/SelectWithPlaceholder';
import { settings, Setting } from './settings';
import { Config } from '../index';

function SettingRow({
  setting,
  value,
  onChange
}: {
  setting: Setting;
  value?: string | number;
  onChange: (key: string, value?: string | number) => void;
}) {
  if (setting.type === 'text') {
    return (
      <EuiFormRow
        label={setting.label}
        helpText={setting.helpText}
        error={setting.validationError}
        isInvalid={setting.isInvalid(value)}
      >
        <EuiFieldText
          placeholder={setting.placeholder}
          value={value}
          onChange={v => onChange(setting.key, v.target.value)}
        />
      </EuiFormRow>
    );
  }

  if (setting.type === 'number') {
    return (
      <EuiFormRow
        label={setting.label}
        helpText={setting.helpText}
        error={setting.validationError}
        isInvalid={setting.isInvalid(value)}
      >
        <EuiFieldNumber
          placeholder={setting.placeholder}
          value={value}
          min={setting.min}
          max={setting.max}
          onChange={v => onChange(setting.key, v.target.value)}
        />
      </EuiFormRow>
    );
  }

  if (setting.type === 'select') {
    return (
      <EuiFormRow label={setting.label} helpText={setting.helpText}>
        <SelectWithPlaceholder
          placeholder={setting.placeholder}
          options={setting.options}
          value={value}
          onChange={v => onChange(setting.key, v.target.value)}
        />
      </EuiFormRow>
    );
  }

  return null;
}

export function SettingsSection({
  agentName,
  configSettings,
  onChange
}: {
  agentName?: string;
  configSettings: Config['settings'];
  onChange: (key: string, value?: string | number) => void;
}) {
  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate(
            'xpack.apm.settings.agentConf.settingsSection.title',
            { defaultMessage: 'Options' }
          )}
        </h3>
      </EuiTitle>

      <EuiSpacer size="m" />

      {settings.map(setting => (
        <SettingRow
          setting={setting}
          value={configSettings[setting.key]}
          onChange={onChange}
        />
      ))}
    </>
  );
}
