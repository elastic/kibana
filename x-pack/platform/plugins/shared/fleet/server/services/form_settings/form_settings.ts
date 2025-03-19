/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Props, schema } from '@kbn/config-schema';
import { stringifyZodError } from '@kbn/zod-helpers';

import type { SettingsConfig, SettingsSection } from '../../../common/settings/types';
import { AGENT_POLICY_ADVANCED_SETTINGS } from '../../../common/settings';
import type { AgentPolicy } from '../../types';

export function getSettingsAPISchema(settingSection: SettingsSection) {
  const settings = getSettings(settingSection);

  return _getSettingsAPISchema(settings);
}

export function _getSettingsAPISchema(settings: SettingsConfig[]): Props {
  const validations: Props = {};
  settings.forEach((setting) => {
    if (!setting.api_field) {
      return;
    }
    validations[setting.api_field.name] = schema.maybe(
      schema.oneOf([
        schema.literal(null),
        schema.any({
          validate: (val: any) => {
            const res = setting.schema.safeParse(val);
            if (!res.success) {
              return stringifyZodError(res.error);
            }
          },
        }),
      ])
    );
  });

  const advancedSettingsValidations: Props = {
    advanced_settings: schema.maybe(
      schema.object({
        ...validations,
      })
    ),
  };
  return advancedSettingsValidations;
}

export function getSettingsValuesForAgentPolicy(
  settingSection: SettingsSection,
  agentPolicy: AgentPolicy
) {
  const settings = getSettings(settingSection);

  return _getSettingsValuesForAgentPolicy(settings, agentPolicy);
}

export function _getSettingsValuesForAgentPolicy(
  settings: SettingsConfig[],
  agentPolicy: AgentPolicy
) {
  const settingsValues: { [k: string]: any } = {};
  settings.forEach((setting) => {
    if (!setting.api_field) {
      return;
    }

    const val = agentPolicy.advanced_settings?.[setting.api_field.name];
    if (val !== undefined) {
      settingsValues[setting.name] = val;
    }
  });
  return settingsValues;
}

export function getSettings(settingSection: SettingsSection) {
  if (settingSection === 'AGENT_POLICY_ADVANCED_SETTINGS') {
    return AGENT_POLICY_ADVANCED_SETTINGS;
  }

  throw new Error(`Invalid settings section ${settingSection}`);
}
