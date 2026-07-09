/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { z } from '@kbn/zod/v4';
import { settingDefinitions } from '../setting_definitions';
import type { SettingValidation, SettingZodValidation } from '../setting_definitions/types';

// retrieve validation from config definitions settings and validate on the server
const knownSettings = settingDefinitions.reduce<Record<string, SettingValidation>>(
  (acc, { key, validation }) => {
    acc[key] = validation;
    return acc;
  },
  {}
);

// zod equivalent of `knownSettings`, additive (io-ts -> zod migration).
const knownSettingsZod = settingDefinitions.reduce<Record<string, SettingZodValidation>>(
  (acc, { key, zodValidation }) => {
    acc[key] = zodValidation;
    return acc;
  },
  {}
);

export const serviceRt = t.partial({
  name: t.string,
  environment: t.string,
});

/**
 * zod equivalent, additive (see `default_api_types.ts` in `@kbn/apm-api-shared`
 * for why - elastic/kibana#243355).
 */
export const serviceSchema = z.object({
  name: z.string().optional(),
  environment: z.string().optional(),
});

export const settingsRt = t.intersection([t.record(t.string, t.string), t.partial(knownSettings)]);

export const agentConfigurationIntakeRt = t.intersection([
  t.partial({ agent_name: t.string }),
  t.type({
    service: serviceRt,
    settings: settingsRt,
  }),
]);

/**
 * zod equivalent of `settingsRt`: every value must be a string, and known
 * settings additionally pass their per-setting validation (mirrors io-ts's
 * `t.intersection([t.record(t.string, t.string), t.partial(knownSettings)])`).
 */
export const settingsSchema = z.record(z.string(), z.string()).superRefine((settings, ctx) => {
  for (const [key, validator] of Object.entries(knownSettingsZod)) {
    const value = settings[key];
    if (value !== undefined) {
      const result = validator.safeParse(value);
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({ code: 'custom', path: [key], message: issue.message });
        }
      }
    }
  }
});

// zod equivalent of `agentConfigurationIntakeRt`, additive.
export const agentConfigurationIntakeSchema = z.object({
  agent_name: z.string().optional(),
  service: serviceSchema,
  settings: settingsSchema,
});
