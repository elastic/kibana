/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Why a page does not serve. The Share modal shows every reason that applies. */
export type WorkflowPageOfflineReason =
  | 'pages_disabled'
  | 'encryption_unavailable'
  | 'no_access_level'
  | 'page_disabled'
  | 'workflow_disabled'
  | 'workflow_invalid'
  | 'no_service_account'
  | 'service_accounts_disabled'
  | 'not_bound'
  | 'service_account_missing'
  | 'service_account_disabled';

export interface WorkflowPageStatus {
  online: boolean;
  reasons: WorkflowPageOfflineReason[];
}

/** The response of `GET` on the page API. */
export interface WorkflowPageResponse {
  workflowId: string;
  pageId: string;
  access: { level: 'secret_link' } | null;
  /** The page switch. The URL stays the same while it is off. */
  enabled: boolean;
  /** The page URL, with the server base path and the space prefix. */
  url: string;
  status: WorkflowPageStatus;
}
