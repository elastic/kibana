/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * POST /internal/agent_builder/sml/_search
 */
export interface SmlSearchHttpResponse {
  total: number;
  results: SmlSearchHttpResultItem[];
}

export interface SmlSearchHttpResultItem {
  chunk_id: string;
  attachment_id: string;
  attachment_type: string;
  title: string;
  content: string;
  score: number;
}
