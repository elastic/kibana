/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryRelease, ExperimentalDataStreamFeature } from './epm';
import type { PolicySecretReference } from './secret';

export interface PackagePolicyPackage {
  name: string;
  title: string;
  version: string;
  experimental_data_stream_features?: ExperimentalDataStreamFeature[];
  requires_root?: boolean;
}

export interface PackagePolicyConfigRecordEntry {
  type?: string;
  value?: any;
  frozen?: boolean;
}

export type PackagePolicyConfigRecord = Record<string, PackagePolicyConfigRecordEntry>;

export interface NewPackagePolicyInputStream {
  id?: string;
  enabled: boolean;
  keep_enabled?: boolean;
  data_stream: {
    dataset: string;
    type: string;
    elasticsearch?: {
      // TODO: these don't really need to be defined in the package policy schema and could be pulled directly from
      // the package where needed.
      dynamic_dataset?: boolean;
      dynamic_namespace?: boolean;
      privileges?: {
        indices?: string[];
      };

      // Package policy specific values
      index_mode?: string;
      source_mode?: string;
    };
  };
  release?: RegistryRelease;
  vars?: PackagePolicyConfigRecord;
  config?: PackagePolicyConfigRecord;
}

export interface PackagePolicyInputStream extends NewPackagePolicyInputStream {
  id: string;
  compiled_stream?: any;
}

export interface NewPackagePolicyInput {
  id?: string;
  type: string;
  policy_template?: string;
  enabled: boolean;
  keep_enabled?: boolean;
  vars?: PackagePolicyConfigRecord;
  config?: PackagePolicyConfigRecord;
  streams: NewPackagePolicyInputStream[];
}

export interface PackagePolicyInput extends Omit<NewPackagePolicyInput, 'streams'> {
  streams: PackagePolicyInputStream[];
  compiled_input?: any;
}

export interface NewPackagePolicy {
  id?: string | number;
  name: string;
  description?: string;
  namespace?: string;
  enabled: boolean;
  is_managed?: boolean;
  /** @deprecated Nullable to allow user to clear existing policy id */
  policy_id?: string | null;
  policy_ids: string[];
  // Nullable to allow user to reset to default outputs
  output_id?: string | null;
  package?: PackagePolicyPackage;
  inputs: NewPackagePolicyInput[];
  vars?: PackagePolicyConfigRecord;
  elasticsearch?: {
    privileges?: {
      cluster?: string[];
    };
    [key: string]: any;
  };
  overrides?: { inputs?: { [key: string]: any } } | null;
  supports_agentless?: boolean | null;
  additional_datastreams_permissions?: string[];
}

export interface UpdatePackagePolicy extends NewPackagePolicy {
  version?: string;
}

// SO definition for this type is declared in server/types/interfaces
export interface PackagePolicy extends Omit<NewPackagePolicy, 'inputs'> {
  id: string;
  spaceIds?: string[];
  inputs: PackagePolicyInput[];
  version?: string;
  agents?: number;
  revision: number;
  secret_references?: PolicySecretReference[];
  updated_at: string;
  updated_by: string;
  created_at: string;
  created_by: string;
}

export type DryRunPackagePolicy = NewPackagePolicy & {
  errors?: Array<{ key: string | undefined; message: string }>;
  missingVars?: string[];
};
