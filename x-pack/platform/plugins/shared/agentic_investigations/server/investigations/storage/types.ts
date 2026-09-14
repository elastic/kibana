/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Raw attribute shape stored in the `nightshift-investigation` saved object.
 * Uses `string` for fields that NSI narrows to enums — this layer is
 * schema-neutral; domain validation happens in the NSI client.
 */
export interface InvestigationAttributes {
  status: string;
  subject_type: string;
  subject_id: string;
  subject_summary?: string;
  trigger_type: string;
  concurrency_key?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  executed_by?: string;
  error?: string;
  summary?: string;
  conclusion?: string;
  severity?: string;
  hypotheses?: Array<Record<string, unknown>>;
  recommendations?: Array<Record<string, unknown>>;
  blind_spots?: Array<Record<string, unknown>>;
  trigger_feedback?: Array<Record<string, unknown>>;
  conversation_id?: string;
  impact?: { entities: Array<Record<string, unknown>> };
}
