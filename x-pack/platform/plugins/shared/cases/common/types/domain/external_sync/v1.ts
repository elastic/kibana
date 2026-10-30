/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  ExternalSyncFieldMapping as GeneratedExternalSyncFieldMapping,
  ExternalSyncFieldRule as GeneratedExternalSyncFieldRule,
  ExternalSyncSettings as GeneratedExternalSyncSettings,
} from '../../../bundled-types.gen';

/**
 * External sync (technical preview). Leaf module so cases, configuration and
 * connector mappings can all reference it without import cycles.
 */

const EXTERNAL_SYNC_FIELDS = ['title', 'description', 'status', 'tags', 'comments'] as const;

/** Request-size ceiling only; the configure validators enforce the per-connector product limit. */
const MAX_EXTERNAL_SYNC_FIELD_MAPPINGS_SCHEMA = 100;

export const ExternalSyncConflictStrategySchema = lazySchema(() => z.enum(['external', 'kibana']));

export const ExternalSyncSettingsSchema = GeneratedExternalSyncSettings;

export const ExternalSyncFieldSchema = lazySchema(() => z.enum(EXTERNAL_SYNC_FIELDS));

export const ExternalSyncDirectionSchema = lazySchema(() =>
  z.enum(['both', 'push', 'pull', 'off'])
);

export const ExternalSyncFieldRuleSchema = GeneratedExternalSyncFieldRule;

export const ExternalSyncFieldRulesSchema = lazySchema(() =>
  z.array(ExternalSyncFieldRuleSchema).max(EXTERNAL_SYNC_FIELDS.length * 2)
);

/**
 * Carries one external field onto a global case field (stored under `extended_fields`).
 */
export const ExternalSyncFieldMappingSchema = GeneratedExternalSyncFieldMapping;

export const ExternalSyncFieldMappingsSchema = lazySchema(() =>
  z.array(ExternalSyncFieldMappingSchema).max(MAX_EXTERNAL_SYNC_FIELD_MAPPINGS_SCHEMA)
);

export type ExternalSyncConflictStrategy = z.infer<typeof ExternalSyncConflictStrategySchema>;
export type ExternalSyncSettings = z.infer<typeof ExternalSyncSettingsSchema>;
export type ExternalSyncField = z.infer<typeof ExternalSyncFieldSchema>;
export type ExternalSyncDirection = z.infer<typeof ExternalSyncDirectionSchema>;
export type ExternalSyncFieldRule = z.infer<typeof ExternalSyncFieldRuleSchema>;
export type ExternalSyncFieldRules = z.infer<typeof ExternalSyncFieldRulesSchema>;
export type ExternalSyncFieldMapping = z.infer<typeof ExternalSyncFieldMappingSchema>;
export type ExternalSyncFieldMappings = z.infer<typeof ExternalSyncFieldMappingsSchema>;
