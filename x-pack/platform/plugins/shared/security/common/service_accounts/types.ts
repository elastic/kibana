/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceAccountWorkloadBinder } from '@kbn/core-security-common';

/**
 * The principal that created an account.
 */
export type ServiceAccountDirectoryCreator = ServiceAccountWorkloadBinder & {
  displayName?: string;
};

/**
 * A service account as the directory routes report it.
 */
export interface ServiceAccountDirectoryEntry {
  /** Opaque identifier. Its structure differs between backends and must not be parsed. */
  id: string;
  name: string;
  description?: string;
  /**
   * Role names assigned to the account.
   */
  roles: string[];
  /** Whether the account can authenticate. Always `true` on UIAM, which has no disabled state. */
  enabled: boolean;
  /**
   * Whether this Kibana can exchange the account for a token and act as it.
   *
   * Both backends answer that question, by different means. On UIAM it is the account's
   * `assumable_by` policy naming this project, which UIAM enforces before it will report the
   * account at all, so everything Kibana can see is assumable. On Elasticsearch it is Kibana
   * holding the token it minted, which an account created outside Kibana never had.
   *
   * Binding and execution also require a valid workload binding and a credential that can be
   * exchanged successfully; this directory field alone does not guarantee execution will succeed.
   *
   * Reading one account confirms the answer against Elasticsearch. Listing them does not, so a
   * listed account deleted and recreated outside Kibana keeps a stale `true` until it is opened,
   * and assuming it would fail.
   */
  assumable: boolean;
  /**
   * The principal that created the account. Reported on UIAM, which records a creator of its
   * own, and absent on Elasticsearch until Elasticsearch stores one too.
   */
  createdBy?: ServiceAccountDirectoryCreator;
  // No creation time. UIAM reports no timestamp of any kind, and the only one Elasticsearch could
  // offer is on the credential Kibana stored, which dates Kibana's record rather than the
  // account. It arrives with the same followup that brings the Elasticsearch creator.
}

/**
 * One page of the directory. `nextPage` is the cursor to send back as `after` for the next page,
 * and is absent on the last one.
 */
export interface ListServiceAccountsResponse {
  serviceAccounts: ServiceAccountDirectoryEntry[];
  nextPage?: string;
}

/**
 * A workload bound to a service account, as the management routes report it. The workload type is
 * scoped to the plugin that registered it, so `pluginId` and `workloadType` name the type
 * together.
 */
export interface ServiceAccountBoundWorkload {
  pluginId: string;
  workloadType: string;
  workloadId: string;
  spaceId: string;
  /**
   * What to call the workload in the UI. The workload id for now, until a workload type can
   * resolve its bindings to a title of its own.
   */
  displayName: string;
}

/** Every workload bound to one service account, across spaces. */
export interface ListServiceAccountWorkloadsResponse {
  workloads: ServiceAccountBoundWorkload[];
}

/**
 * The body of a successful delete. `warnings` describes anything the delete left behind, and is
 * empty when it cleaned up everything.
 */
export interface DeleteServiceAccountResponse {
  warnings: string[];
}

/**
 * The `attributes` of the 409 the delete route answers with when the account is still bound to
 * workloads and the caller did not force the delete.
 */
export interface DeleteServiceAccountConflictAttributes {
  workloads: ServiceAccountBoundWorkload[];
}
