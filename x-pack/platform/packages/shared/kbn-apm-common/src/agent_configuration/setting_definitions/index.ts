/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { sortBy } from 'lodash';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { isEDOTAgentName, isOTELAgentName, isRumOrMobileAgentName } from '@kbn/elastic-agent-utils';
import { booleanSchema } from '../runtime_types/boolean_rt';
import { getIntegerSchema } from '../runtime_types/integer_rt';
import { floatThreeDecimalPlacesSchema } from '../runtime_types/float_three_decimal_places_rt';
import { floatFourDecimalPlacesSchema } from '../runtime_types/float_four_decimal_places_rt';
import type { RawSettingDefinition, SettingDefinition } from './types';
import { generalSettings } from './general_settings';
import { javaSettings } from './java_settings';
import { edotSDKSettings } from './edot_sdk_settings';
import { mobileSettings } from './mobile_settings';
import { getDurationSchema } from '../runtime_types/duration_rt';
import { getBytesSchema } from '../runtime_types/bytes_rt';
import { getStorageSizeSchema } from '../runtime_types/storage_size_rt';

function getSettingDefaults(setting: RawSettingDefinition): SettingDefinition {
  switch (setting.type) {
    case 'select':
      return { validation: z.string(), ...setting };

    case 'boolean':
      return { validation: booleanSchema, ...setting };

    case 'text':
      return { validation: z.string(), ...setting };

    case 'integer': {
      const { min, max } = setting;

      return {
        validation: getIntegerSchema({ min, max }),
        min,
        max,
        ...setting,
      };
    }

    case 'float': {
      if (setting.key === 'transaction_sample_rate' || setting.key === 'sampling_rate') {
        return {
          validation: floatFourDecimalPlacesSchema,
          ...setting,
        };
      }
      return {
        validation: floatThreeDecimalPlacesSchema,
        ...setting,
      };
    }

    case 'bytes': {
      const units = setting.units ?? ['b', 'kb', 'mb'];
      const min = setting.min ?? '0b';
      const max = setting.max;

      return {
        validation: getBytesSchema({ min, max }),
        units,
        min,
        ...setting,
      };
    }

    case 'storageSize': {
      const units = setting.units ?? ['B', 'KB', 'MB', 'GB', 'TB'];
      const min = setting.min ?? '0b';
      const max = setting.max;

      return {
        validation: getStorageSizeSchema({ min, max }),
        units,
        min,
        ...setting,
      };
    }

    case 'duration': {
      const units = setting.units ?? ['ms', 's', 'm'];
      const min = setting.min ?? '1ms';
      const max = setting.max;

      return {
        validation: getDurationSchema({ min, max }),
        units,
        min,
        ...setting,
      };
    }

    default:
      return setting;
  }
}

export function filterByAgent(agentName?: AgentName) {
  return (setting: SettingDefinition) => {
    // agentName is missing if "All" was selected
    if (!agentName) {
      // options that only apply to certain agents will be filtered out
      if (setting.includeAgents) {
        return false;
      }

      // only options that apply to every agent (ignoring RUM, EDOT and OTEL) should be returned
      if (setting.excludeAgents) {
        return setting.excludeAgents.every(
          (agent) =>
            isRumOrMobileAgentName(agent) || isEDOTAgentName(agent) || isOTELAgentName(agent)
        );
      }

      return true;
    }

    if (setting.includeAgents) {
      return setting.includeAgents.includes(agentName);
    }

    if (setting.excludeAgents) {
      return !setting.excludeAgents.includes(agentName);
    }

    return true;
  };
}

export function validateSetting(setting: SettingDefinition, value: unknown) {
  const result = setting.validation.safeParse(value);
  return {
    isValid: result.success,
    message: result.success ? undefined : result.error.issues[0]?.message,
  };
}

export const settingDefinitions: SettingDefinition[] = sortBy(
  [...generalSettings, ...javaSettings, ...mobileSettings, ...edotSDKSettings].map(
    getSettingDefaults
  ),
  'key'
);
