/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowAccessOperation } from '@kbn/workflows';
import type { WorkflowPageAccess } from './page_saved_object';
import type { WorkflowPageRef } from './page_secret';

/** Why a page URL did not resolve. For the audit log only: the visitor always gets a plain 404. */
export type WorkflowPageMissReason =
  | 'global_space'
  | 'page_not_found'
  | 'page_offline'
  | 'secret_mismatch'
  | 'workflow_not_found'
  | 'stale_page'
  | 'workflow_disabled'
  | 'workflow_invalid'
  | 'trigger_missing'
  | 'not_bound';

/** What callers see of a page. Never holds the secret or its hash. */
export interface WorkflowPageDto {
  workflowId: string;
  pageId: string;
  access: WorkflowPageAccess | null;
  /** The page switch. A disabled page is offline while its workflow keeps running. */
  enabled: boolean;
  /**
   * True when the page itself allows serving: enabled, with an access level and an encryption
   * key. The public route also needs the workflow to be enabled, valid, and bound.
   */
  online: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

/** A page in the client's space. The space comes from the request. */
export type WorkflowPageKey = Omit<WorkflowPageRef, 'spaceId'>;

/** The page operations, keyed like `WorkflowsManagementOperationPrivileges`. */
export type WorkflowPageOperation = 'readPage' | 'managePage';

export type WorkflowPageAuditParams = WorkflowPageRef & { error?: unknown };

/** Why a page was retired. */
export type WorkflowPageRetireReason =
  | 'trigger_removed'
  | 'workflow_deleted'
  | 'workflow_moved'
  | 'workflow_revived'
  | 'stale_workflow';

/**
 * The audit events of pages. The lifecycle events take no request when a write runs without one,
 * and the actor is then the system.
 */
export interface WorkflowPageAuditLog {
  logPageCreated(request: KibanaRequest | undefined, params: WorkflowPageAuditParams): void;
  logPageRetired(
    request: KibanaRequest | undefined,
    params: WorkflowPageAuditParams & { reason: WorkflowPageRetireReason }
  ): void;
  logPageLinkRead(request: KibanaRequest, params: WorkflowPageAuditParams): void;
  logPageSecretRotated(request: KibanaRequest, params: WorkflowPageAuditParams): void;
  logPageAccessChanged(
    request: KibanaRequest | undefined,
    params: WorkflowPageAuditParams & { access: WorkflowPageAccess | null }
  ): void;
  logPageEnabledChanged(
    request: KibanaRequest,
    params: WorkflowPageAuditParams & { enabled: boolean }
  ): void;
}

/** Throws when the workflow is missing or its ACL denies the operation to the caller. */
export type AssertWorkflowAccess = (
  workflow: { workflowId: string; spaceId: string },
  operation: WorkflowAccessOperation,
  request: KibanaRequest
) => Promise<void>;
