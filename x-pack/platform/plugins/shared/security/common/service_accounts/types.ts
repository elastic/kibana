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
