/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_FIELD_VALUE_LENGTH } from '@kbn/apm-types';
import { settingDefinitions } from '../setting_definitions';
import type { SettingValidation } from '../setting_definitions/types';

// retrieve validation from config definitions settings and validate on the server
const knownSettings = settingDefinitions.reduce<Record<string, SettingValidation>>(
  (acc, { key, validation }) => {
    acc[key] = validation;
    return acc;
  },
  {}
);

// Upper bounds for the request body (DoS hardening). Names and environments are ECS keyword fields
// (`ignore_above: 1024`); setting values can be long lists (e.g. ignored URLs).
const MAX_SETTING_VALUE_LENGTH = 100_000;

export const serviceSchema = z.object({
  name: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
  environment: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
});

/**
 * Every value must be a string, and known settings additionally pass their
 * per-setting validation.
 */
export const settingsSchema = z
  .record(z.string().max(MAX_FIELD_VALUE_LENGTH), z.string().max(MAX_SETTING_VALUE_LENGTH))
  .superRefine((settings, ctx) => {
    for (const [key, validator] of Object.entries(knownSettings)) {
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

export const agentConfigurationIntakeSchema = z.object({
  agent_name: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
  service: serviceSchema,
  settings: settingsSchema,
});
