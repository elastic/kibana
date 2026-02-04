/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlUpdateAction } from '@kbn/agent-builder-server/attachments';

export interface SmlIndexerRequestBody {
  attachment_type: string;
  attachment_id: string;
  action: SmlUpdateAction;
  space_id?: string;
}

export interface SmlIndexerResponse {
  ack: boolean;
}

export interface SmlSearchRequestQuery {
  query: string;
  size?: number;
}

export interface SmlSearchResult {
  chunk_id: string;
  attachment_id: string;
  attachment_type: string;
  type: string;
  title?: string;
  content: string;
  spaces: string[];
}

export interface SmlSearchResponse {
  results: SmlSearchResult[];
  total: number;
}
