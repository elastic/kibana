/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-server';
import { z } from '@kbn/zod/v4';
import type { CaseAttributes, Observable } from '../../../common/types/domain';
import { CaseAttributesSchema } from '../../../common/types/domain';
import type { ConnectorPersisted } from './connectors';
import type { ExternalServicePersisted } from './external_service';
import type { User, UserProfile } from './user';

export enum CasePersistedSeverity {
  LOW = 0,
  MEDIUM = 10,
  HIGH = 20,
  CRITICAL = 30,
}

export enum CasePersistedStatus {
  OPEN = 0,
  IN_PROGRESS = 10,
  CLOSED = 20,
}

export interface CasePersistedAttributes {
  assignees: UserProfile[];
  closed_at: string | null;
  closed_by: User | null;
  created_at: string;
  created_by: User;
  in_progress_at?: string | null;
  connector: ConnectorPersisted;
  description: string;
  duration: number | null;
  external_service: ExternalServicePersisted | null;
  owner: string;
  settings: {
    syncAlerts: boolean;
    extractObservables?: boolean;
    extractObservablesSource?: string;
  };
  severity: CasePersistedSeverity;
  status: CasePersistedStatus;
  tags: string[];
  title: string;
  total_alerts: number;
  total_comments: number;
  total_events?: number;
  total_observables?: number;
  updated_at: string | null;
  updated_by: User | null;
  category?: string | null;
  customFields?: CasePersistedCustomFields;
  observables?: Observable[];
  incremental_id?: number | null;
  time_to_acknowledge?: number | null;
  time_to_investigate?: number | null;
  time_to_resolve?: number | null;
  template?: {
    id: string;
    version: number;
  } | null;
  extended_fields?: Record<string, unknown> | null;
  /**
   * Which path set `settings.extractObservables`. Server-owned: it is never part of a request or
   * a response, and only the write codec for new cases keeps it.
   */
  extract_observables_source?: string;
}

type CasePersistedCustomFields = Array<{
  key: string;
  type: string;
  value: null | unknown;
}>;

export type CaseTransformedAttributes = CaseAttributes;
export type CaseTransformedAttributesWithAttachmentStats = CaseAttributes & {
  total_comments: number;
  total_alerts: number;
  total_events: number;
};

export const CaseTransformedAttributesSchema = CaseAttributesSchema;

export const ExtractObservablesSourceSchema = z.enum([
  'explicit',
  'template',
  'space_default',
  'rule',
]);

export type ExtractObservablesSource = z.infer<typeof ExtractObservablesSourceSchema>;

/**
 * Write schema for new cases. `extract_observables_source` is set only by the server. It is outside
 * `CaseAttributesSchema` on purpose: that schema also shapes the public request and response.
 * Read schemas keep dropping this key, so it never reaches an API response.
 */
export const CaseCreateAttributesSchema = CaseAttributesSchema.extend({
  extract_observables_source: ExtractObservablesSourceSchema.optional(),
});

export type CaseCreateAttributes = CaseTransformedAttributes & {
  extract_observables_source?: ExtractObservablesSource;
};

/**
 * We add the `total_comments`, `total_alerts`, and `total_events` properties to allow the
 * attachments stats to be updated.
 */
export const getPartialCaseTransformedAttributesSchema = () =>
  CaseAttributesSchema.partial().extend({
    total_comments: z.number().optional(),
    total_alerts: z.number().optional(),
    total_events: z.number().optional(),
  });

export type CaseSavedObject = SavedObject<CasePersistedAttributes>;
export type CaseSavedObjectTransformed = SavedObject<CaseTransformedAttributes>;

export const OwnerSchema = z.object({ owner: z.string() });
