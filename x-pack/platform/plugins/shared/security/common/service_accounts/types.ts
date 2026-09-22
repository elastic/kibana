/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceAccountWorkloadBinder } from '@kbn/core-security-common';

/**
 * The principal that created an account. The binder's fields identify it durably; `displayName`
 * is what to show, when the backend can say. `userProfileId` is included so the UI can link to
 * the person where a profile exists.
 */
export type ServiceAccountDirectoryCreator = ServiceAccountWorkloadBinder & {
  displayName?: string;
};

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
   * Whether the account is one Kibana created and still holds a credential for. Always `true` on
   * UIAM, where Kibana exchanges for a token instead of holding one. `false` on Elasticsearch for
   * an account that was created outside Kibana.
   *
   * Not a promise that the account can be bound to a workload: binding is a property of the
   * deployment, and the Elasticsearch backend refuses every bind until the token exchange lands
   * (https://github.com/elastic/kibana/issues/284466). On Elasticsearch it can also go stale for
   * a listed account, because Kibana's record outlives an account deleted and recreated outside
   * Kibana; reading one account confirms the record, listing them does not.
   */
  hasCredential: boolean;
  /**
   * The principal that created the account, when the backend records one. Carries the same
   * staleness caveat as {@link ServiceAccountDirectoryEntry.hasCredential}: on Elasticsearch it
   * describes whoever created the credential Kibana stored, which a recreated account outdates.
   */
  createdBy?: ServiceAccountDirectoryCreator;
  /** ISO-8601 creation time, when the backend records one. */
  createdAt?: string;
}

/**
 * One page of the directory. `nextPage` is the cursor to send back as `after` for the next page,
 * and is absent on the last one.
 */
export interface ListServiceAccountsResponse {
  serviceAccounts: ServiceAccountDirectoryEntry[];
  nextPage?: string;
}
