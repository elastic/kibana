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

// Leaf module: imported by the case, configuration and connector mapping schemas.

/** The built-in case fields a connector can sync, in display order. */
export const EXTERNAL_SYNC_FIELDS = [
  'title',
  'description',
  'status',
  'tags',
  'comments',
] as const satisfies ReadonlyArray<ExternalSyncField>;

/** Decode ceiling for stored mappings; requests are capped at MAX_EXTERNAL_SYNC_FIELD_MAPPINGS. */
const MAX_EXTERNAL_SYNC_FIELD_MAPPINGS_SCHEMA = 100;

export const ExternalSyncSettingsSchema = GeneratedExternalSyncSettings;

export const ExternalSyncFieldRuleSchema = GeneratedExternalSyncFieldRule;

export const ExternalSyncFieldRulesSchema = lazySchema(() =>
  z.array(ExternalSyncFieldRuleSchema).max(EXTERNAL_SYNC_FIELDS.length * 2)
);

export const ExternalSyncFieldMappingSchema = GeneratedExternalSyncFieldMapping;

export const ExternalSyncFieldMappingsSchema = lazySchema(() =>
  z.array(ExternalSyncFieldMappingSchema).max(MAX_EXTERNAL_SYNC_FIELD_MAPPINGS_SCHEMA)
);

export type ExternalSyncSettings = z.infer<typeof ExternalSyncSettingsSchema>;
export type ExternalSyncConflictStrategy = ExternalSyncSettings['conflictStrategy'];
export type ExternalSyncFieldRule = z.infer<typeof ExternalSyncFieldRuleSchema>;
export type ExternalSyncField = ExternalSyncFieldRule['field'];
export type ExternalSyncDirection = ExternalSyncFieldRule['direction'];
export type ExternalSyncFieldRules = z.infer<typeof ExternalSyncFieldRulesSchema>;
export type ExternalSyncFieldMapping = z.infer<typeof ExternalSyncFieldMappingSchema>;
export type ExternalSyncFieldMappings = z.infer<typeof ExternalSyncFieldMappingsSchema>;
