/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import React from 'react';
import { EuiCheckbox, EuiFieldNumber, EuiFieldText, EuiSelect } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import type { SettingsConfig } from '../../../../../common/settings/types';
import { YamlCodeEditorWithPlaceholder } from '../../sections/settings/components/edit_output_flyout/yaml_code_editor_with_placeholder';

import { SettingsFieldGroup } from './settings_field_group';
import { getInnerType, SettingsFieldWrapper } from './settings_field_wrapper';

export const settingComponentRegistry = new Map<
  string,
  (settingsconfig: SettingsConfig & { disabled?: boolean }) => React.ReactElement
>();

settingComponentRegistry.set('object', ({ disabled, ...settingsConfig }) => (
  <SettingsFieldGroup settingsConfig={settingsConfig} disabled={disabled} />
));

settingComponentRegistry.set('number', ({ disabled, ...settingsConfig }) => {
  return (
    <SettingsFieldWrapper
      settingsConfig={settingsConfig}
      typeName="number"
      renderItem={({ fieldKey, fieldValue, handleChange, isInvalid, coercedSchema }: any) => (
        <EuiFieldNumber
          fullWidth
          disabled={disabled}
          data-test-subj={fieldKey}
          value={fieldValue}
          onChange={handleChange}
          isInvalid={isInvalid}
          min={coercedSchema.minValue ?? undefined}
          max={coercedSchema.maxValue ?? undefined}
        />
      )}
    />
  );
});

settingComponentRegistry.set('string', ({ disabled, ...settingsConfig }) => {
  if (settingsConfig.type === 'yaml') {
    return (
      <SettingsFieldWrapper
        settingsConfig={settingsConfig}
        typeName="string"
        renderItem={({ fieldKey, fieldValue, handleChange, isInvalid, coercedSchema }: any) => (
          <YamlCodeEditorWithPlaceholder
            value={fieldValue}
            onChange={(value) => handleChange({ target: { value } })}
            disabled={disabled}
            placeholder={i18n.translate(
              'xpack.fleet.settings.agentPolicyAdvanced.yamlSettingsPlaceholder',
              {
                defaultMessage: '# Add YAML settings here',
              }
            )}
            data-test-subj={fieldKey}
          />
        )}
      />
    );
  }
  return (
    <SettingsFieldWrapper
      settingsConfig={settingsConfig}
      typeName="string"
      renderItem={({ fieldKey, fieldValue, handleChange, isInvalid }: any) => (
        <EuiFieldText
          fullWidth
          disabled={disabled}
          data-test-subj={fieldKey}
          value={fieldValue}
          onChange={handleChange}
          isInvalid={isInvalid}
        />
      )}
    />
  );
});

settingComponentRegistry.set('enum', ({ disabled, ...settingsConfig }) => {
  return (
    <SettingsFieldWrapper
      disabled={disabled}
      settingsConfig={settingsConfig}
      typeName="enum"
      renderItem={({ fieldKey, fieldValue, handleChange }: any) => (
        <EuiSelect
          data-test-subj={fieldKey}
          value={fieldValue}
          fullWidth
          disabled={disabled}
          onChange={handleChange}
          aria-label={
            settingsConfig.title ??
            i18n.translate('xpack.fleet.configuredSettings.selectOptionsAriaLabel', {
              defaultMessage: 'Settings options',
            })
          }
          options={
            settingsConfig.options
              ? settingsConfig.options
              : Object.values((settingsConfig.schema as z.ZodEnum).def.entries).map((value) => ({
                  text: value,
                  value,
                }))
          }
        />
      )}
    />
  );
});

settingComponentRegistry.set('boolean', ({ disabled, ...settingsConfig }) => {
  return (
    <SettingsFieldWrapper
      disabled={disabled}
      settingsConfig={settingsConfig}
      typeName="boolean"
      renderItem={({ fieldKey, fieldValue, handleChange }: any) => (
        <EuiCheckbox
          data-test-subj={fieldKey}
          id={fieldKey}
          label={i18n.translate('xpack.fleet.configuredSettings.genericCheckboxLabel', {
            defaultMessage: 'Enable',
          })}
          checked={fieldValue}
          onChange={handleChange}
        />
      )}
    />
  );
});

export function ConfiguredSettings({
  configuredSettings,
  disabled,
}: {
  configuredSettings: SettingsConfig[];
  disabled?: boolean;
}) {
  return (
    <>
      {configuredSettings
        .filter((configuredSetting) => !configuredSetting.hidden)
        .map((configuredSetting) => {
          const Component = settingComponentRegistry.get(getInnerType(configuredSetting.schema));

          if (!Component) {
            throw new Error(`Unknown setting type: ${configuredSetting.schema.def.type}`);
          }

          return (
            <Component key={configuredSetting.name} {...configuredSetting} disabled={disabled} />
          );
        })}
    </>
  );
}
