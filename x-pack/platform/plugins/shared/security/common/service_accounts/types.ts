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
   * Whether this Kibana can exchange the account for a token and act as it.
   *
   * Both backends answer that question, by different means. On UIAM it is the account's
   * `assumable_by` policy naming this project, which UIAM enforces before it will report the
   * account at all, so everything Kibana can see is assumable. On Elasticsearch it is Kibana
   * holding the token it minted, which an account created outside Kibana never had.
   *
   * The Elasticsearch token exchange is still landing
   * (https://github.com/elastic/kibana/issues/284466). Until it does, `true` there means the
   * account is ready to be assumed rather than that assuming it works today. Binding a workload
   * asks for more again, so treat this as the account's half of that answer and not the whole.
   *
   * Reading one account confirms the answer against Elasticsearch. Listing them does not, so a
   * listed account deleted and recreated outside Kibana keeps a stale `true` until it is opened,
   * and assuming it would fail.
   */
  assumable: boolean;
  /**
   * The principal that created the account. Reported on UIAM, which records a creator of its
   * own, and absent on Elasticsearch until Elasticsearch stores one too.
   *
   * Kibana will not stand in for it in the meantime. The only creator it could name on
   * Elasticsearch is the one on the credential it stored, which says who asked Kibana to create
   * the account rather than who owns it now, and goes stale the moment someone recreates the
   * account out of band. Reporting it would have the UI show an attribution it then has to
   * unlearn, so the field waits for Elasticsearch in a followup.
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
