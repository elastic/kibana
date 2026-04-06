/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * An SML record as returned by the public CRUD API.
 * Aligned with the server-side `SmlDocument` interface.
 */
export interface SmlRecordHttpResponse {
  id: string;
  type: string;
  title: string;
  origin_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  spaces: string[];
  permissions: string[];
  tags?: string[];
  user_defined?: boolean;
  params?: Record<string, unknown>;
}

export type GetSmlRecordResponse = SmlRecordHttpResponse;

export type CreateOrUpdateSmlRecordResponse = SmlRecordHttpResponse;

export interface DeleteSmlRecordResponse {
  success: boolean;
}
