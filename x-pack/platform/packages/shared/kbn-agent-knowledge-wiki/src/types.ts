/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const WIKI_PAGE_STATUSES = ['established', 'tentative', 'archived'] as const;

export type WikiPageStatus = (typeof WIKI_PAGE_STATUSES)[number];

/** Confirmations from later runs a tentative page needs before it is promoted to established. */
export const WIKI_PROMOTION_CORROBORATIONS = 1;

export interface WikiPageSummary<TEntityType extends string = string> {
  id: string;
  title: string;
  entity_type: TEntityType;
  status: WikiPageStatus;
  corroborations: number;
  updated_at: string;
  description?: string;
  conversation_id?: string;
  round_id?: string;
  workflow_execution_id?: string;
  /**
   * Conversations that created or rewrote the page, unlike `conversation_id`, which names whoever
   * wrote it last, including a write that only corroborated it.
   */
  authored_by?: string[];
  doc_version?: number;
  /** Ids of the entries added to the page one at a time, so the same entry is never added twice. */
  entry_ids?: string[];
}

export interface WikiPage<TEntityType extends string = string>
  extends WikiPageSummary<TEntityType> {
  content: string;
  slug: string;
  /** Opaque stored-document version; pass it back on a write to reject concurrent changes. */
  version?: string;
}

export interface WikiStats {
  total: number;
  established: number;
  total_corroborations: number;
  last_updated?: string;
}
