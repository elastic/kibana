/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { SEVERITY_LEVELS } from './constants';

/**
 * Canonical alert event severity schema, shared across the alerting_v2 plugin, the schemas
 * package, and the rule builder. Built from the runtime-light {@link SEVERITY_LEVELS} tuple so
 * browser-shared consumers can import the ordered values without pulling Zod into their bundle.
 */
export const alertEventSeveritySchema = z.enum(SEVERITY_LEVELS);

export const alertEventSeverity = alertEventSeveritySchema.enum;

export type AlertEventSeverity = z.infer<typeof alertEventSeveritySchema>;
