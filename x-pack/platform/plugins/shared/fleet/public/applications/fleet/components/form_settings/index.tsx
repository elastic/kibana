/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCheckbox, EuiFieldNumber, EuiFieldText, EuiSelect } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import type { SettingsConfig } from '../../../../../common/settings/types';
import { YamlCodeEditorWithPlaceholder } from '../../sections/settings/components/edit_output_flyout/yaml_code_editor_with_placeholder';

import { SettingsFieldGroup } from './settings_field_group';
import { getInnerType, SettingsFieldWrapper, ZodSchemaType } from './settings_field_wrapper';

export const settingComponentRegistry = new Map<
  string,
  (settingsconfig: SettingsConfig & { disabled?: boolean }) => React.ReactElement
>();

const getEnumOptions = (schema: SettingsConfig['schema']) => {
  let currentSchema: any = schema;

  while (currentSchema) {
    const v4Type = currentSchema?._zod?.def?.type;
    const v3Type = currentSchema?._def?.typeName;

    if (v4Type === 'default' || v4Type === 'optional') {
      currentSchema = currentSchema._zod.def.innerType;
      continue;
    }

    if (v3Type === 'ZodDefault' || v3Type === 'ZodOptional') {
      currentSchema = currentSchema._def.innerType;
      continue;
    }

    break;
  }

  const entries = currentSchema?._zod?.def?.entries;
  if (entries && typeof entries === 'object') {
    return Object.values(entries).map((value) => ({ text: String(value), value: String(value) }));
  }

  const values = currentSchema?._def?.values;
  if (Array.isArray(values)) {
    return values.map((value) => ({ text: String(value), value: String(value) }));
  }

  return [];
};

settingComponentRegistry.set(ZodSchemaType.object, ({ disabled, ...settingsConfig }) => (
  <SettingsFieldGroup settingsConfig={settingsConfig} disabled={disabled} />
));

settingComponentRegistry.set(ZodSchemaType.number, ({ disabled, ...settingsConfig }) => {
  return (
    <SettingsFieldWrapper
      settingsConfig={settingsConfig}
      typeName={ZodSchemaType.number}
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

settingComponentRegistry.set(ZodSchemaType.string, ({ disabled, ...settingsConfig }) => {
  if (settingsConfig.type === 'yaml') {
    return (
      <SettingsFieldWrapper
        settingsConfig={settingsConfig}
        typeName={ZodSchemaType.string}
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
      typeName={ZodSchemaType.string}
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

settingComponentRegistry.set(ZodSchemaType.enum, ({ disabled, ...settingsConfig }) => {
  return (
    <SettingsFieldWrapper
      disabled={disabled}
      settingsConfig={settingsConfig}
      typeName={ZodSchemaType.enum}
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
            settingsConfig.options ? settingsConfig.options : getEnumOptions(settingsConfig.schema)
          }
        />
      )}
    />
  );
});

settingComponentRegistry.set(ZodSchemaType.boolean, ({ disabled, ...settingsConfig }) => {
  return (
    <SettingsFieldWrapper
      disabled={disabled}
      settingsConfig={settingsConfig}
      typeName={ZodSchemaType.boolean}
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
            throw new Error(`Unknown setting type: ${getInnerType(configuredSetting.schema)}`);
          }

          return (
            <Component key={configuredSetting.name} {...configuredSetting} disabled={disabled} />
          );
        })}
    </>
  );
}
