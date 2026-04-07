/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlDocument } from '../../server/services/sml/types';

/**
 * The body payload for creating or updating an SML record.
 */
export type SmlRecordCreateBody = Pick<
  SmlDocument,
  'type' | 'title' | 'origin_id' | 'content' | 'spaces'
> &
  Partial<Pick<SmlDocument, 'permissions' | 'tags' | 'params'>>;

/**
 * An SML record as returned by the public CRUD API.
 * Aligned with the server-side `SmlDocument` interface.
 */
export type SmlRecordHttpResponse = Omit<SmlDocument, 'semantic_title' | 'semantic_content'>;

export type GetSmlRecordResponse = SmlRecordHttpResponse;

export type CreateOrUpdateSmlRecordResponse = SmlRecordHttpResponse;

export interface DeleteSmlRecordResponse {
  success: boolean;
}
