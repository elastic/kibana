/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type CspStatusCode =
  | 'indexed' // latest findings index exists and has results
  | 'indexing' // index timeout was not surpassed since installation, assumes data is being indexed
  | 'unprivileged' // user lacks privileges for the latest findings index
  | 'index-timeout' // index timeout was surpassed since installation
  | 'not-deployed' // no healthy agents were deployed
  | 'not-installed' // number of installed csp integrations is 0;
  | 'waiting_for_results'; // have healthy agents but no findings at all, assumes data is being indexed for the 1st time

export type IndexStatus =
  | 'not-empty' // Index contains documents
  | 'empty' // Index doesn't contain documents (or doesn't exist)
  | 'unprivileged'; // User doesn't have access to query the index

export interface IndexDetails {
  index: string;
  status: IndexStatus;
}

export interface BaseCspSetupBothPolicy {
  status: CspStatusCode;
  installedPackagePolicies: number;
  healthyAgents: number;
}

export interface BaseCspSetupStatus {
  indicesDetails: IndexDetails[];
  latestPackageVersion: string;
  cspm: BaseCspSetupBothPolicy;
  kspm: BaseCspSetupBothPolicy;
  vuln_mgmt: BaseCspSetupBothPolicy;
  isPluginInitialized: boolean;
  installedPackageVersion?: string | undefined;
  hasMisconfigurationsFindings?: boolean;
}

export type CspSetupStatus = BaseCspSetupStatus;
