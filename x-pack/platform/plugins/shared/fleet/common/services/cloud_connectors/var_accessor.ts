/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo, RegistryVarsEntry } from '../../types/models/epm';
import type {
  NewPackagePolicy,
  PackagePolicy,
  PackagePolicyConfigRecord,
  PackagePolicyConfigRecordEntry,
} from '../../types/models/package_policy';
import type { CloudProvider } from '../../types/models/cloud_connector';

import type {
  CloudConnectorVarStorageMode,
  CloudConnectorVarTarget,
  ResolvedVarTarget,
  NormalizedAwsCredentials,
  NormalizedAzureCredentials,
  NormalizedCloudConnectorCredentials,
} from './types';

import { INVALID_INDEX } from './constants';

import { getCredentialSchema, getAllVarKeys, getAllSupportedVarNames } from './schemas';

/**
 * Determines the storage scope for cloud connector credential variables based on PackageInfo.
 *
 * Cloud connector credentials can be stored at two different scopes:
 * - Package scope: Variables stored at policy.vars (global to the package)
 * - Input/stream scope: Variables stored at policy.inputs[].streams[].vars
 *
 * Package scope is used when PackageInfo.vars contains cloud connector credential var definitions.
 * Input/stream scope is the default when credentials are defined at the stream level.
 *
 * @param packageInfo - The package info containing var definitions
 * @returns The storage scope ('package' or 'input')
 */
export function getCredentialStorageScope(packageInfo: PackageInfo): CloudConnectorVarStorageMode {
  const packageVars: RegistryVarsEntry[] = packageInfo.vars || [];
  const supportedVarNames = getAllSupportedVarNames();

  const hasPackageLevelCredentials = packageVars.some((varDef) =>
    supportedVarNames.includes(varDef.name)
  );

  return hasPackageLevelCredentials ? 'package' : 'input';
}

/**
 * Resolves the target location for cloud connector variables in a package policy
 *
 * For package mode: returns reference to policy.vars
 * For input mode: validates single enabled input/stream and returns reference to stream.vars
 *
 * @param packagePolicy - The package policy to resolve target for
 * @param mode - The storage mode to use
 * @returns The resolved var target with the vars container
 */
export function resolveVarTarget(
  packagePolicy: NewPackagePolicy | PackagePolicy,
  mode: CloudConnectorVarStorageMode
): ResolvedVarTarget {
  if (mode === 'package') {
    return {
      target: { mode: 'package' },
      vars: packagePolicy.vars,
    };
  }

  // Input mode: find enabled input and stream
  const enabledInputIndex = packagePolicy.inputs.findIndex((input) => input.enabled);
  if (enabledInputIndex === INVALID_INDEX) {
    return {
      target: { mode: 'input', inputIndex: INVALID_INDEX, streamIndex: INVALID_INDEX },
      vars: undefined,
    };
  }

  const enabledInput = packagePolicy.inputs[enabledInputIndex];
  const enabledStreamIndex =
    enabledInput.streams?.findIndex((stream) => stream.enabled) ?? INVALID_INDEX;

  if (enabledStreamIndex === INVALID_INDEX) {
    return {
      target: { mode: 'input', inputIndex: enabledInputIndex, streamIndex: INVALID_INDEX },
      vars: undefined,
    };
  }

  return {
    target: { mode: 'input', inputIndex: enabledInputIndex, streamIndex: enabledStreamIndex },
    vars: enabledInput.streams[enabledStreamIndex].vars,
  };
}

/**
 * Applies updated vars at the correct location based on the resolved target.
 *
 * This is the write-side complement to resolveVarTarget (which handles reading).
 * - Package scope: Updates policy.vars (global to the package)
 * - Input/stream scope: Updates policy.inputs[].streams[].vars
 *
 * @param policy - The package policy to update
 * @param updatedVars - The updated vars to apply
 * @param target - The resolved target indicating where to apply vars
 * @returns A new policy with updated vars at the correct location
 */
export function applyVarsAtTarget<T extends NewPackagePolicy | PackagePolicy>(
  policy: T,
  updatedVars: PackagePolicyConfigRecord,
  target: CloudConnectorVarTarget
): T {
  // Package scope: update policy.vars
  if (target.mode === 'package') {
    return {
      ...policy,
      vars: updatedVars,
    };
  }

  // Input/stream scope: update the nested stream vars
  const { inputIndex, streamIndex } = target;
  if (inputIndex === INVALID_INDEX || streamIndex === INVALID_INDEX) {
    return policy;
  }

  const updatedInputs = [...policy.inputs];
  const updatedInput = { ...updatedInputs[inputIndex] };
  const updatedStreams = [...updatedInput.streams];
  updatedStreams[streamIndex] = {
    ...updatedStreams[streamIndex],
    vars: updatedVars,
  };
  updatedInput.streams = updatedStreams;
  updatedInputs[inputIndex] = updatedInput;

  return {
    ...policy,
    inputs: updatedInputs,
  } as T;
}

/**
 * Extracts the value from a var entry, handling both simple values and secret references
 *
 * @param varEntry - The var entry to extract value from
 * @returns The extracted value (string, secret reference, or undefined)
 */
function extractVarValue(
  varEntry: PackagePolicyConfigRecordEntry | undefined
): string | { id: string; isSecretRef: boolean } | undefined {
  if (!varEntry?.value) {
    return undefined;
  }

  // Handle string values directly
  if (typeof varEntry.value === 'string') {
    return varEntry.value;
  }

  // Handle secret reference objects
  if (
    typeof varEntry.value === 'object' &&
    'id' in varEntry.value &&
    'isSecretRef' in varEntry.value
  ) {
    return { id: varEntry.value.id, isSecretRef: varEntry.value.isSecretRef };
  }

  return undefined;
}

/**
 * Finds the first existing var entry by checking primary key and all aliases
 *
 * @param vars - The vars container to search
 * @param varKeys - Array of var key names to check (primary and aliases)
 * @returns The found var entry or undefined
 */
export function findFirstVarEntry(
  vars: PackagePolicyConfigRecord | undefined,
  varKeys: string[]
): PackagePolicyConfigRecordEntry | undefined {
  if (!vars) {
    return undefined;
  }

  for (const key of varKeys) {
    if (vars[key]) {
      return vars[key];
    }
  }
  return undefined;
}

/**
 * Finds a var value by checking primary key and all aliases
 *
 * @param vars - The vars container to search
 * @param varKeys - Array of var key names to check (primary and aliases)
 * @returns The found var value or undefined
 */
function findVarValue(
  vars: PackagePolicyConfigRecord | undefined,
  varKeys: string[]
): string | { id: string; isSecretRef: boolean } | undefined {
  if (!vars) {
    return undefined;
  }

  const entry = findFirstVarEntry(vars, varKeys);
  return entry ? extractVarValue(entry) : undefined;
}

/**
 * Extracts raw credential variables from the correct location in a package policy
 *
 * This function determines the storage mode from PackageInfo and extracts
 * the raw vars container from the appropriate location.
 *
 * @param packagePolicy - The package policy to extract from
 * @param packageInfo - The package info for mode detection
 * @returns The raw vars container or undefined if not found
 */
export function extractRawCredentialVars(
  packagePolicy: NewPackagePolicy | PackagePolicy,
  packageInfo: PackageInfo
): PackagePolicyConfigRecord | undefined {
  const mode = getCredentialStorageScope(packageInfo);
  const { vars } = resolveVarTarget(packagePolicy, mode);
  return vars;
}

/**
 * Reads and normalizes AWS credentials from a package policy
 *
 * @param vars - The vars container to read from
 * @returns Normalized AWS credentials
 */
function readAwsCredentials(vars: PackagePolicyConfigRecord | undefined): NormalizedAwsCredentials {
  const schema = getCredentialSchema('aws');

  return {
    roleArn: findVarValue(vars, getAllVarKeys(schema.fields.roleArn)) as string | undefined,
    externalId: findVarValue(vars, getAllVarKeys(schema.fields.externalId)),
  };
}

/**
 * Reads and normalizes Azure credentials from a package policy
 *
 * @param vars - The vars container to read from
 * @returns Normalized Azure credentials
 */
function readAzureCredentials(
  vars: PackagePolicyConfigRecord | undefined
): NormalizedAzureCredentials {
  const schema = getCredentialSchema('azure');

  return {
    tenantId: findVarValue(vars, getAllVarKeys(schema.fields.tenantId)),
    clientId: findVarValue(vars, getAllVarKeys(schema.fields.clientId)),
    azureCredentialsCloudConnectorId: findVarValue(
      vars,
      getAllVarKeys(schema.fields.azureCredentialsCloudConnectorId)
    ) as string | undefined,
  };
}

/**
 * Reads normalized credentials from a package policy for a given provider
 *
 * @param packagePolicy - The package policy to read from
 * @param provider - The cloud provider
 * @param packageInfo - The package info for mode detection
 * @returns Normalized credentials for the provider
 */
export function readCredentials(
  packagePolicy: NewPackagePolicy | PackagePolicy,
  provider: CloudProvider,
  packageInfo: PackageInfo
): NormalizedCloudConnectorCredentials {
  const vars = extractRawCredentialVars(packagePolicy, packageInfo);

  switch (provider) {
    case 'aws':
      return readAwsCredentials(vars);
    case 'azure':
      return readAzureCredentials(vars);
    case 'gcp':
      // GCP stub - return empty credentials for now
      return {};
    default:
      throw new Error(`Unknown cloud provider: ${provider}`);
  }
}

/**
 * Finds the first existing var key in a vars container
 *
 * @param vars - The vars container to search
 * @param varKeys - Array of var key names to check
 * @returns The first existing key or undefined
 */
function findExistingVarKey(
  vars: PackagePolicyConfigRecord | undefined,
  varKeys: string[]
): string | undefined {
  if (!vars) {
    return undefined;
  }

  for (const key of varKeys) {
    if (key in vars) {
      return key;
    }
  }

  return undefined;
}

/**
 * Writes AWS credentials to a vars container
 *
 * @param vars - The vars container to write to
 * @param credentials - The credentials to write
 * @returns Updated vars container
 */
function writeAwsCredentials(
  vars: PackagePolicyConfigRecord,
  credentials: Partial<NormalizedAwsCredentials>
): PackagePolicyConfigRecord {
  const schema = getCredentialSchema('aws');
  const updatedVars = { ...vars };

  // Write roleArn
  if (credentials.roleArn !== undefined) {
    const roleArnKeys = getAllVarKeys(schema.fields.roleArn);
    const existingKey = findExistingVarKey(vars, roleArnKeys) || roleArnKeys[0];
    updatedVars[existingKey] = {
      ...vars[existingKey],
      value: credentials.roleArn,
    };
  }

  // Write externalId
  if (credentials.externalId !== undefined) {
    const externalIdKeys = getAllVarKeys(schema.fields.externalId);
    const existingKey = findExistingVarKey(vars, externalIdKeys) || externalIdKeys[0];
    updatedVars[existingKey] = {
      ...vars[existingKey],
      value: credentials.externalId,
    };
  }

  return updatedVars;
}

/**
 * Writes Azure credentials to a vars container
 *
 * @param vars - The vars container to write to
 * @param credentials - The credentials to write
 * @returns Updated vars container
 */
function writeAzureCredentials(
  vars: PackagePolicyConfigRecord,
  credentials: Partial<NormalizedAzureCredentials>
): PackagePolicyConfigRecord {
  const schema = getCredentialSchema('azure');
  const updatedVars = { ...vars };

  // Write tenantId
  if (credentials.tenantId !== undefined) {
    const tenantIdKeys = getAllVarKeys(schema.fields.tenantId);
    const existingKey = findExistingVarKey(vars, tenantIdKeys) || tenantIdKeys[0];
    updatedVars[existingKey] = {
      ...vars[existingKey],
      value: credentials.tenantId,
    };
  }

  // Write clientId
  if (credentials.clientId !== undefined) {
    const clientIdKeys = getAllVarKeys(schema.fields.clientId);
    const existingKey = findExistingVarKey(vars, clientIdKeys) || clientIdKeys[0];
    updatedVars[existingKey] = {
      ...vars[existingKey],
      value: credentials.clientId,
    };
  }

  // Write azureCredentialsCloudConnectorId
  if (credentials.azureCredentialsCloudConnectorId !== undefined) {
    const connectorIdKeys = getAllVarKeys(schema.fields.azureCredentialsCloudConnectorId);
    const existingKey = findExistingVarKey(vars, connectorIdKeys) || connectorIdKeys[0];
    updatedVars[existingKey] = {
      ...vars[existingKey],
      value: credentials.azureCredentialsCloudConnectorId,
    };
  }

  return updatedVars;
}

/**
 * Writes credentials to the correct location in a package policy
 *
 * Returns a new package policy with the updated credentials.
 * Does not mutate the original policy.
 *
 * @param packagePolicy - The package policy to update
 * @param credentials - The credentials to write
 * @param provider - The cloud provider
 * @param packageInfo - The package info for mode detection
 * @returns Updated package policy with credentials written
 */
export function writeCredentials<T extends NewPackagePolicy | PackagePolicy>(
  packagePolicy: T,
  credentials: Partial<NormalizedCloudConnectorCredentials>,
  provider: CloudProvider,
  packageInfo: PackageInfo
): T {
  const mode = getCredentialStorageScope(packageInfo);
  const { target, vars } = resolveVarTarget(packagePolicy, mode);

  if (!vars) {
    // No vars container found, return original policy
    return packagePolicy;
  }

  // Write credentials based on provider
  let updatedVars: PackagePolicyConfigRecord;
  switch (provider) {
    case 'aws':
      updatedVars = writeAwsCredentials(vars, credentials as Partial<NormalizedAwsCredentials>);
      break;
    case 'azure':
      updatedVars = writeAzureCredentials(vars, credentials as Partial<NormalizedAzureCredentials>);
      break;
    case 'gcp':
      // GCP stub - return original vars for now
      updatedVars = vars;
      break;
    default:
      throw new Error(`Unknown cloud provider: ${provider}`);
  }

  // Create new policy with updated vars in the correct location
  if (target.mode === 'package') {
    return {
      ...packagePolicy,
      vars: updatedVars,
    };
  }

  // Input mode: update the correct stream
  const { inputIndex, streamIndex } = target;
  const updatedInputs = [...packagePolicy.inputs];
  const updatedInput = { ...updatedInputs[inputIndex] };
  const updatedStreams = [...updatedInput.streams];
  updatedStreams[streamIndex] = {
    ...updatedStreams[streamIndex],
    vars: updatedVars,
  };
  updatedInput.streams = updatedStreams;
  updatedInputs[inputIndex] = updatedInput;

  return {
    ...packagePolicy,
    inputs: updatedInputs,
  };
}

/**
 * Gets the var target for a specific provider and package
 * Utility function for cases where you need the target info without reading credentials
 *
 * @param packagePolicy - The package policy
 * @param packageInfo - The package info
 * @returns The resolved var target
 */
export function getVarTarget(
  packagePolicy: NewPackagePolicy | PackagePolicy,
  packageInfo: PackageInfo
): CloudConnectorVarTarget {
  const mode = getCredentialStorageScope(packageInfo);
  const { target } = resolveVarTarget(packagePolicy, mode);
  return target;
}
