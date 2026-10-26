/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { INVESTIGATION_SEVERITIES } from './constants';
import type { InvestigationSeverity } from './investigation';

export const setInvestigationSeverityRequestSchema = z.object({
  severity: z.enum(INVESTIGATION_SEVERITIES),
});

export type SetInvestigationSeverityRequest = z.infer<typeof setInvestigationSeverityRequestSchema>;

export interface SetInvestigationSeverityResponse {
  conversation_id: string;
  severity: InvestigationSeverity;
  /** The severity before the change, absent when none was set. */
  previous_severity?: InvestigationSeverity;
}

/**
 * Written to the investigation's timeline when a user changes its severity, so both the people
 * reading the conversation and the agent continuing it can tell a human judgement from the
 * agent's own rating.
 */
export const INVESTIGATION_SEVERITY_CHANGED_EVENT_TYPE = 'investigation_severity_changed' as const;

export const investigationSeverityChangedEventSchema = z.object({
  severity: z.enum(INVESTIGATION_SEVERITIES),
  previous_severity: z.enum(INVESTIGATION_SEVERITIES).optional(),
});

export type InvestigationSeverityChangedEventData = z.infer<
  typeof investigationSeverityChangedEventSchema
>;
