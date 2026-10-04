/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

/**
 * External sync (technical preview). Leaf module so cases, configuration and
 * connector mappings can all reference it without import cycles.
 */

export const ExternalSyncConflictStrategyRt = rt.union([
  rt.literal('external'),
  rt.literal('kibana'),
]);

export const ExternalSyncSettingsRt = rt.strict({
  autoPush: rt.boolean,
  conflictStrategy: ExternalSyncConflictStrategyRt,
});

export const ExternalSyncFieldRt = rt.union([
  rt.literal('title'),
  rt.literal('description'),
  rt.literal('status'),
  rt.literal('tags'),
  rt.literal('comments'),
]);

export const ExternalSyncDirectionRt = rt.union([
  rt.literal('both'),
  rt.literal('push'),
  rt.literal('pull'),
  rt.literal('off'),
]);

export const ExternalSyncFieldRuleRt = rt.intersection([
  rt.strict({
    field: ExternalSyncFieldRt,
    direction: ExternalSyncDirectionRt,
  }),
  rt.exact(
    rt.partial({
      /**
       * Overrides the case's conflict strategy for this field
       */
      conflictStrategy: ExternalSyncConflictStrategyRt,
    })
  ),
]);

export const ExternalSyncFieldRulesRt = rt.array(ExternalSyncFieldRuleRt);

/**
 * Carries one external field onto a global case field (stored under `extended_fields`).
 */
export const ExternalSyncFieldMappingRt = rt.intersection([
  rt.strict({
    externalField: rt.string,
    caseField: rt.string,
    direction: ExternalSyncDirectionRt,
  }),
  rt.exact(
    rt.partial({
      conflictStrategy: ExternalSyncConflictStrategyRt,
    })
  ),
]);

export const ExternalSyncFieldMappingsRt = rt.array(ExternalSyncFieldMappingRt);

export type ExternalSyncConflictStrategy = rt.TypeOf<typeof ExternalSyncConflictStrategyRt>;
export type ExternalSyncSettings = rt.TypeOf<typeof ExternalSyncSettingsRt>;
export type ExternalSyncField = rt.TypeOf<typeof ExternalSyncFieldRt>;
export type ExternalSyncDirection = rt.TypeOf<typeof ExternalSyncDirectionRt>;
export type ExternalSyncFieldRule = rt.TypeOf<typeof ExternalSyncFieldRuleRt>;
export type ExternalSyncFieldRules = rt.TypeOf<typeof ExternalSyncFieldRulesRt>;
export type ExternalSyncFieldMapping = rt.TypeOf<typeof ExternalSyncFieldMappingRt>;
export type ExternalSyncFieldMappings = rt.TypeOf<typeof ExternalSyncFieldMappingsRt>;
