/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceAccountWorkloadBinder } from '@kbn/core-security-common';

/**
 * A service account as the directory routes report it, in one shape for every backend. Where a
 * backend cannot answer a question, the field holds a constant rather than going missing, so the
 * UI renders the same way on both.
 */
export interface ServiceAccountDirectoryEntry {
  /** Opaque identifier. Its structure differs between backends and must not be parsed. */
  id: string;
  name: string;
  /**
   * Role names assigned to the account. Empty on UIAM until it reports application roles: a UIAM
   * account is granted its creator's privileges rather than named roles.
   */
  roles: string[];
  /** Whether the account can authenticate. Always `true` on UIAM, which has no disabled state. */
  enabled: boolean;
  /**
   * Whether Kibana holds a credential for the account, and so can bind it to workloads. Always
   * `true` on UIAM, where Kibana exchanges for a token instead of holding one. `false` on
   * Elasticsearch for an account that was created outside Kibana.
   */
  hasCredential: boolean;
  /** The principal that created the account, when the backend records one. */
  createdBy?: ServiceAccountWorkloadBinder;
  /** ISO-8601 creation time, when the backend records one. */
  createdAt?: string;
}

/**
 * One page of the directory. `next_page` is the cursor to send back as `after` for the next
 * page, and is absent on the last one.
 */
export interface ListServiceAccountsResponse {
  service_accounts: ServiceAccountDirectoryEntry[];
  next_page?: string;
}
