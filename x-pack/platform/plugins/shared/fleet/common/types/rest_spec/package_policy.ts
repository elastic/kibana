/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type {
  BulkGetPackagePoliciesRequestSchema,
  GetPackagePoliciesRequestSchema,
} from '../../../server/types';

import type {
  PackagePolicy,
  NewPackagePolicy,
  UpdatePackagePolicy,
  DryRunPackagePolicy,
  PackagePolicyPackage,
  FullAgentPolicyInput,
} from '../models';
import type { inputsFormat } from '../../constants';

import type { BulkGetResult, ListResult } from './common';

export interface GetPackagePoliciesRequest {
  query: TypeOf<typeof GetPackagePoliciesRequestSchema.query>;
}

export type GetPackagePoliciesResponse = ListResult<PackagePolicy>;
export type BulkGetPackagePoliciesRequestBody = TypeOf<
  typeof BulkGetPackagePoliciesRequestSchema.body
>;
export type BulkGetPackagePoliciesResponse = BulkGetResult<PackagePolicy>;

export interface GetOnePackagePolicyRequest {
  params: {
    packagePolicyId: string;
  };
}

export interface GetOnePackagePolicyResponse {
  item: PackagePolicy;
}

export interface CreatePackagePolicyRequest {
  body: NewPackagePolicy & {
    force?: boolean;
    create_dataset_templates?: boolean;
    acknowledge_agent_version_incompatibility?: boolean;
  };
  query: {
    format?: typeof inputsFormat.Simplified | typeof inputsFormat.Legacy;
  };
}

export interface CreatePackagePolicyResponse {
  item: PackagePolicy;
}

export type UpdatePackagePolicyRequest = GetOnePackagePolicyRequest & {
  body: UpdatePackagePolicy & { acknowledge_agent_version_incompatibility?: boolean };
};

export type UpdatePackagePolicyResponse = CreatePackagePolicyResponse;

export interface DeletePackagePoliciesRequest {
  query?: {
    onboarding_deployment_id?: string;
  };
  body: {
    packagePolicyIds: string[];
    force?: boolean;
  };
}

export type DeletePackagePoliciesResponse = PackagePolicy[];

export type PostDeletePackagePoliciesResponse = Array<{
  id: string;
  name?: string;
  success: boolean;
  package?: PackagePolicyPackage;
  policy_id?: string | null;
  policy_ids?: string[];
  output_id?: string;
  // Support generic errors
  statusCode?: number;
  body?: {
    message: string;
    /** Error details. `type` is `agent_version_incompatible` when agents block the upgrade. */
    attributes?: { type?: string; limit?: number; agent_version_block?: AgentVersionBlock };
  };
}>;

export interface UpgradePackagePolicyBaseResponse {
  name?: string;

  // Support generic errors
  statusCode?: number;
  body?: {
    message: string;
    /** Error details. `type` is `agent_version_incompatible` when agents block the upgrade. */
    attributes?: { type?: string; limit?: number; agent_version_block?: AgentVersionBlock };
  };
}

/**
 * Active agents that don't satisfy a package-level `conditions.agent.version`, and so would stop
 * receiving the integration's inputs.
 */
export interface AgentVersionBlock {
  package_name: string;
  package_version: string;
  version_condition: string;
  /** Omitted, with `observed_versions` and `min_version`, for callers that can't read agents. */
  blocked_count?: number;
  /** The versions reported by the blocked agents. */
  observed_versions?: string[];
  /** The lowest agent version satisfying the condition, when the blocked agents all run below it. */
  min_version?: string;
}

export interface UpgradePackagePolicyDryRunResponseItem extends UpgradePackagePolicyBaseResponse {
  hasErrors: boolean;
  diff?: [PackagePolicy, DryRunPackagePolicy];
  agent_diff?: [FullAgentPolicyInput[]];
  /** Set when the upgrade is blocked because some agents don't satisfy the target version's agent version condition. */
  agent_version_block?: AgentVersionBlock;
}

export type UpgradePackagePolicyDryRunResponse = UpgradePackagePolicyDryRunResponseItem[];

export interface UpgradePackagePolicyResponseItem extends UpgradePackagePolicyBaseResponse {
  id: string;
  success: boolean;
}

export type UpgradePackagePolicyResponse = UpgradePackagePolicyResponseItem[];
