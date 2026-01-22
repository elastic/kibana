/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '../../types/models/epm';
import type { RegistryVarGroup } from '../../types/models/package_spec';
import type { CloudProvider } from '../../types/models/cloud_connector';
import type {
  NewPackagePolicy,
  PackagePolicyConfigRecord,
  PackagePolicyConfigRecordEntry,
} from '../../types/models/package_policy';

import type {
  CloudConnectorVarStorageMode,
  CloudConnectorVarTargetResult,
  CloudConnectorCredentialsReadResult,
  CloudConnectorVarAccessorOptions,
  CloudConnectorCredentialVarKey,
} from './types';
import { CloudConnectorVarAccessorError, CloudConnectorVarAccessorErrorCode } from './types';
import { getCredentialSchema } from './schemas';

/**
 * Detects the Cloud Connector var storage mode from PackageInfo.
 *
 * Package mode is detected when var_groups with cloud_connector options are present.
 * Otherwise, input mode is assumed.
 *
 * @param packageInfo - The package info to analyze
 * @returns The storage mode ('package' or 'input')
 */
export function detectStorageMode(packageInfo?: PackageInfo): CloudConnectorVarStorageMode {
  if (!packageInfo) {
    return 'input';
  }

  // Check if var_groups exist with cloud connector-related options
  const varGroups = (packageInfo as any).var_groups as RegistryVarGroup[] | undefined;
  if (varGroups && varGroups.length > 0) {
    // Check if any var group option has cloud connector-related properties
    const hasCloudConnectorVarGroup = varGroups.some((group) =>
      group.options.some(
        (option) =>
          // Check for provider property (common in cloud connector var groups)
          'provider' in option ||
          // Check for cloud_connector_enabled property
          'cloud_connector_enabled' in option ||
          // Check if vars include known cloud connector var names
          option.vars.some(
            (varName) =>
              varName.includes('role_arn') ||
              varName.includes('external_id') ||
              varName.includes('tenant_id') ||
              varName.includes('client_id') ||
              varName.includes('azure_credentials')
          )
      )
    );
    if (hasCloudConnectorVarGroup) {
      return 'package';
    }
  }

  return 'input';
}

/**
 * Resolves the target location for Cloud Connector vars in a package policy.
 *
 * For package mode: Returns the policy.vars container.
 * For input mode: Validates single enabled input/stream and returns that stream's vars.
 *
 * @param packagePolicy - The package policy to resolve vars from
 * @param mode - The storage mode to use
 * @returns The resolved var target with the vars container
 * @throws CloudConnectorVarAccessorError if validation fails (e.g., multiple enabled inputs)
 */
export function resolveVarTarget(
  packagePolicy: NewPackagePolicy,
  mode: CloudConnectorVarStorageMode
): CloudConnectorVarTargetResult {
  if (mode === 'package') {
    return {
      mode: 'package',
      target: { mode: 'package' },
      vars: packagePolicy.vars,
    };
  }

  // Input mode: validate and find the single enabled input with single enabled stream
  const enabledInputs = packagePolicy.inputs
    .map((input, index) => ({ input, index }))
    .filter(({ input }) => input.enabled);

  if (enabledInputs.length === 0) {
    throw new CloudConnectorVarAccessorError(
      'No enabled inputs found in package policy',
      CloudConnectorVarAccessorErrorCode.NO_ENABLED_INPUTS
    );
  }

  if (enabledInputs.length > 1) {
    throw new CloudConnectorVarAccessorError(
      `Multiple enabled inputs found (${enabledInputs.length}). Input-level Cloud Connectors require exactly one enabled input.`,
      CloudConnectorVarAccessorErrorCode.MULTIPLE_ENABLED_INPUTS
    );
  }

  const { input: enabledInput, index: inputIndex } = enabledInputs[0];
  const streams = enabledInput.streams || [];
  const enabledStreams = streams
    .map((stream, index) => ({ stream, index }))
    .filter(({ stream }) => stream.enabled);

  if (enabledStreams.length === 0) {
    throw new CloudConnectorVarAccessorError(
      'No enabled streams found in the enabled input',
      CloudConnectorVarAccessorErrorCode.NO_ENABLED_STREAMS
    );
  }

  if (enabledStreams.length > 1) {
    throw new CloudConnectorVarAccessorError(
      `Multiple enabled streams found (${enabledStreams.length}). Input-level Cloud Connectors require exactly one enabled stream.`,
      CloudConnectorVarAccessorErrorCode.MULTIPLE_ENABLED_STREAMS
    );
  }

  const { stream: enabledStream, index: streamIndex } = enabledStreams[0];

  return {
    mode: 'input',
    target: { mode: 'input', inputIndex, streamIndex },
    vars: enabledStream.vars,
  };
}

/**
 * Finds a var value from a vars container, checking primary key and alternative keys.
 *
 * @param vars - The vars container to search
 * @param varKeyConfig - The var key configuration with alternatives
 * @returns The var entry or undefined if not found
 */
function findVarValue(
  vars: PackagePolicyConfigRecord | undefined,
  varKeyConfig: CloudConnectorCredentialVarKey
): { key: string; value: PackagePolicyConfigRecordEntry } | undefined {
  if (!vars) {
    return undefined;
  }

  // Check primary key first
  if (vars[varKeyConfig.varKey]) {
    return { key: varKeyConfig.varKey, value: vars[varKeyConfig.varKey] };
  }

  // Check alternative keys
  if (varKeyConfig.alternativeKeys) {
    for (const altKey of varKeyConfig.alternativeKeys) {
      if (vars[altKey]) {
        return { key: altKey, value: vars[altKey] };
      }
    }
  }

  return undefined;
}

/**
 * Reads Cloud Connector credentials from a package policy.
 *
 * @param packagePolicy - The package policy to read from
 * @param provider - The cloud provider
 * @param mode - The storage mode (or auto-detect if not provided)
 * @param packageInfo - Optional package info for mode detection
 * @returns The read result with vars and completeness status
 */
export function readCredentials(
  packagePolicy: NewPackagePolicy,
  provider: CloudProvider,
  mode?: CloudConnectorVarStorageMode,
  packageInfo?: PackageInfo
): CloudConnectorCredentialsReadResult {
  const resolvedMode = mode ?? detectStorageMode(packageInfo);
  const { vars } = resolveVarTarget(packagePolicy, resolvedMode);
  const schema = getCredentialSchema(provider);

  if (!vars) {
    return {
      vars: {},
      isComplete: false,
      missingVarKeys: schema.varKeys.map((k) => k.varKey),
    };
  }

  const missingVarKeys: string[] = [];
  const foundVars: PackagePolicyConfigRecord = {};

  for (const varKeyConfig of schema.varKeys) {
    const found = findVarValue(vars, varKeyConfig);
    if (found) {
      foundVars[varKeyConfig.logicalName] = found.value;
    } else {
      missingVarKeys.push(varKeyConfig.varKey);
    }
  }

  return {
    vars: foundVars,
    isComplete: missingVarKeys.length === 0,
    missingVarKeys,
  };
}

/**
 * Writes Cloud Connector credentials to a package policy.
 * Returns a new package policy with the credentials written to the appropriate location.
 *
 * @param packagePolicy - The package policy to write to
 * @param provider - The cloud provider
 * @param credentials - The credentials to write (keyed by logical name)
 * @param mode - The storage mode (or auto-detect if not provided)
 * @param packageInfo - Optional package info for mode detection
 * @returns A new package policy with the credentials written
 */
export function writeCredentials(
  packagePolicy: NewPackagePolicy,
  provider: CloudProvider,
  credentials: PackagePolicyConfigRecord,
  mode?: CloudConnectorVarStorageMode,
  packageInfo?: PackageInfo
): NewPackagePolicy {
  const resolvedMode = mode ?? detectStorageMode(packageInfo);
  const targetResult = resolveVarTarget(packagePolicy, resolvedMode);
  const schema = getCredentialSchema(provider);

  // Build the vars to write using the schema's primary var keys
  const varsToWrite: PackagePolicyConfigRecord = {};
  for (const varKeyConfig of schema.varKeys) {
    const credentialValue = credentials[varKeyConfig.logicalName];
    if (credentialValue !== undefined) {
      varsToWrite[varKeyConfig.varKey] = credentialValue;
    }
  }

  if (targetResult.mode === 'package') {
    // Write to package-level vars
    return {
      ...packagePolicy,
      vars: {
        ...packagePolicy.vars,
        ...varsToWrite,
      },
    };
  }

  // Write to stream-level vars
  const target = targetResult.target as { mode: 'input'; inputIndex: number; streamIndex: number };
  const updatedInputs = packagePolicy.inputs.map((input, inputIdx) => {
    if (inputIdx !== target.inputIndex) {
      return input;
    }

    const updatedStreams = input.streams.map((stream, streamIdx) => {
      if (streamIdx !== target.streamIndex) {
        return stream;
      }

      return {
        ...stream,
        vars: {
          ...stream.vars,
          ...varsToWrite,
        },
      };
    });

    return {
      ...input,
      streams: updatedStreams,
    };
  });

  return {
    ...packagePolicy,
    inputs: updatedInputs,
  };
}

/**
 * Creates a Cloud Connector var accessor bound to a specific provider and optional mode.
 * This provides a convenient API for working with Cloud Connector vars.
 *
 * @param options - The accessor options
 * @returns An accessor object with bound methods
 */
export function createCloudConnectorVarAccessor(options: CloudConnectorVarAccessorOptions) {
  const { provider, forcedMode } = options;

  return {
    /**
     * Detect the storage mode from package info.
     */
    detectMode: (packageInfo?: PackageInfo): CloudConnectorVarStorageMode => {
      if (forcedMode) {
        return forcedMode;
      }
      return detectStorageMode(packageInfo);
    },

    /**
     * Resolve the var target location in a package policy.
     */
    resolveTarget: (
      packagePolicy: NewPackagePolicy,
      packageInfo?: PackageInfo
    ): CloudConnectorVarTargetResult => {
      const mode = forcedMode ?? detectStorageMode(packageInfo);
      return resolveVarTarget(packagePolicy, mode);
    },

    /**
     * Read credentials from a package policy.
     */
    read: (
      packagePolicy: NewPackagePolicy,
      packageInfo?: PackageInfo
    ): CloudConnectorCredentialsReadResult => {
      return readCredentials(packagePolicy, provider, forcedMode, packageInfo);
    },

    /**
     * Write credentials to a package policy.
     */
    write: (
      packagePolicy: NewPackagePolicy,
      credentials: PackagePolicyConfigRecord,
      packageInfo?: PackageInfo
    ): NewPackagePolicy => {
      return writeCredentials(packagePolicy, provider, credentials, forcedMode, packageInfo);
    },

    /**
     * Get the credential schema for this provider.
     */
    getSchema: () => getCredentialSchema(provider),
  };
}

/**
 * Extracts raw credential vars from a package policy without transformation.
 * Useful for getting vars in whatever format they exist (package or stream level).
 *
 * @param packagePolicy - The package policy to extract from
 * @param provider - The cloud provider
 * @param packageInfo - Optional package info for mode detection
 * @returns The raw vars container or undefined
 */
export function extractRawCredentialVars(
  packagePolicy: NewPackagePolicy,
  provider: CloudProvider,
  packageInfo?: PackageInfo
): PackagePolicyConfigRecord | undefined {
  const mode = detectStorageMode(packageInfo);

  try {
    const { vars } = resolveVarTarget(packagePolicy, mode);
    return vars;
  } catch {
    // For input mode, if validation fails, try to get vars from the first available location
    // This is a fallback for non-strict scenarios
    if (mode === 'input') {
      // Try stream vars first
      const streamVars = packagePolicy.inputs.find((input) => input.enabled)?.streams?.[0]?.vars;
      if (streamVars) {
        return streamVars;
      }
    }
    // Fall back to package vars
    return packagePolicy.vars;
  }
}
