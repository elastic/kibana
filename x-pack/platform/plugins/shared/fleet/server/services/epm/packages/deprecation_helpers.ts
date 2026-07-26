/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PackageInfo,
  RegistryPolicyTemplate,
  RegistryInput,
  RegistryStream,
  RegistryVarsEntry,
  RegistryDataStream,
  DeprecationInfo,
} from '../../../../common/types';

interface DeprecationMap {
  package?: DeprecationInfo;
  policyTemplates: Record<string, DeprecationInfo>;
  inputs: Record<string, DeprecationInfo>;
  streams: Record<string, DeprecationInfo>;
  vars: Record<string, DeprecationInfo>;
}

function collectDeprecations(pkg: PackageInfo): DeprecationMap {
  const result: DeprecationMap = {
    policyTemplates: {},
    inputs: {},
    streams: {},
    vars: {},
  };

  if (pkg.deprecated) {
    result.package = pkg.deprecated;
  }

  const collectVarsDeprecations = (vars: RegistryVarsEntry[] | undefined, prefix: string): void => {
    for (const v of vars ?? []) {
      if (v.deprecated) {
        result.vars[`${prefix}/${v.name}`] = v.deprecated;
      }
    }
  };

  const collectStreamDeprecations = (
    streams: RegistryStream[] | undefined,
    prefix: string
  ): void => {
    for (const s of streams ?? []) {
      const streamKey = `${prefix}/${s.input}`;
      if (s.deprecated) {
        result.streams[streamKey] = s.deprecated;
      }
      collectVarsDeprecations(s.vars, streamKey);
    }
  };

  const collectInputDeprecations = (inputs: RegistryInput[] | undefined, prefix: string): void => {
    for (const input of inputs ?? []) {
      const inputKey = `${prefix}/${input.type}`;
      if (input.deprecated) {
        result.inputs[inputKey] = input.deprecated;
      }
      collectVarsDeprecations(input.vars, inputKey);
    }
  };

  collectVarsDeprecations(pkg.vars, 'pkg');

  for (const pt of (pkg.policy_templates ?? []) as RegistryPolicyTemplate[]) {
    if (pt.deprecated) {
      result.policyTemplates[pt.name] = pt.deprecated;
    }
    if ('inputs' in pt && pt.inputs) {
      collectInputDeprecations(pt.inputs, pt.name);
    }
    if ('vars' in pt && pt.vars) {
      collectVarsDeprecations(pt.vars, pt.name);
    }
  }

  for (const ds of (pkg.data_streams ?? []) as RegistryDataStream[]) {
    collectStreamDeprecations(ds.streams, ds.dataset);
  }

  return result;
}

/**
 * Compares two package versions and returns true if the target version
 * introduces deprecations that are not present in the current version.
 *
 * Returns false if the current version already has the same deprecations
 * (to avoid blocking upgrades within an already-deprecated line).
 */
export function hasNewDeprecations(currentPkg: PackageInfo, targetPkg: PackageInfo): boolean {
  const current = collectDeprecations(currentPkg);
  const target = collectDeprecations(targetPkg);

  if (target.package && !current.package) {
    return true;
  }

  for (const key of Object.keys(target.policyTemplates)) {
    if (!current.policyTemplates[key]) {
      return true;
    }
  }

  for (const key of Object.keys(target.inputs)) {
    if (!current.inputs[key]) {
      return true;
    }
  }

  for (const key of Object.keys(target.streams)) {
    if (!current.streams[key]) {
      return true;
    }
  }

  for (const key of Object.keys(target.vars)) {
    if (!current.vars[key]) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts a human-readable summary of the first deprecation found
 * in the target package info, for display in the UI.
 */
export function getDeprecationDetails(pkg: PackageInfo): DeprecationInfo | undefined {
  if (pkg.deprecated) {
    return pkg.deprecated;
  }

  for (const pt of (pkg.policy_templates ?? []) as RegistryPolicyTemplate[]) {
    if (pt.deprecated) {
      return pt.deprecated;
    }
    if ('inputs' in pt && pt.inputs) {
      for (const input of pt.inputs) {
        if (input.deprecated) {
          return input.deprecated;
        }
      }
    }
  }

  for (const ds of (pkg.data_streams ?? []) as RegistryDataStream[]) {
    for (const s of ds.streams ?? []) {
      if (s.deprecated) {
        return s.deprecated;
      }
    }
  }

  return undefined;
}
