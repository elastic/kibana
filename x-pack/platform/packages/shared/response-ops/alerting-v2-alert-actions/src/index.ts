/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';

export { defineAlertActionType } from './define';
export type { AlertActionTypeDefinition, AlertActionDefinition } from './types';

export { ackActionType } from './definitions/ack';
export { unackActionType } from './definitions/unack';
export { tagActionType } from './definitions/tag';
export { snoozeActionType } from './definitions/snooze';
export { unsnoozeActionType } from './definitions/unsnooze';
export { activateActionType } from './definitions/activate';
export { deactivateActionType } from './definitions/deactivate';

import { ackActionType } from './definitions/ack';
import { unackActionType } from './definitions/unack';
import { tagActionType } from './definitions/tag';
import { snoozeActionType } from './definitions/snooze';
import { unsnoozeActionType } from './definitions/unsnooze';
import { activateActionType } from './definitions/activate';
import { deactivateActionType } from './definitions/deactivate';

export const alertActionTypeDefinitions = [
  ackActionType,
  unackActionType,
  tagActionType,
  snoozeActionType,
  unsnoozeActionType,
  activateActionType,
  deactivateActionType,
] as const;

/**
 * Preserves the specific fullSchema type of each definition so that
 * `z.discriminatedUnion` retains literal discriminant types for narrowing.
 */
type ExtractFullSchemas<T extends readonly { fullSchema: z.ZodType }[]> = {
  [K in keyof T]: T[K] extends { fullSchema: infer S } ? S : never;
};

const extractFullSchemas = <T extends readonly { fullSchema: z.ZodType }[]>(
  defs: T
): ExtractFullSchemas<T> => defs.map((d) => d.fullSchema) as ExtractFullSchemas<T>;

/**
 * Typed tuple of `fullSchema` for every registered action type. Pass directly
 * to `z.discriminatedUnion('action_type', alertActionFullSchemas)` to build
 * the discriminated union without manually listing each schema.
 */
export const alertActionFullSchemas = extractFullSchemas(alertActionTypeDefinitions);
