/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AWS_SERVICES_MATRIX } from './aws_service_matrix';
import type { ProviderPermissions } from './aws_provider_permissions';

export interface ResolvedProviderPermissions {
  actions: string[];
  managedPolicyArns: string[];
}

const SERVICE_MAP = new Map(AWS_SERVICES_MATRIX.map((entry) => [entry.id, entry]));

/**
 * Future manifest shape for provider_permissions once packages are upgraded.
 * Not wired in V1 — kept as a typed seam for the follow-up issue.
 */
export interface PackageManifestProviderPermissions {
  actions?: string[];
  managedPolicyArns?: string[];
}

export interface ResolveProviderPermissionsOptions {
  /** When provided, manifest permissions take precedence over hardcoded matrix values. */
  manifestPermissions?: PackageManifestProviderPermissions;
}

function normalizePermissions(
  permissions: ProviderPermissions | PackageManifestProviderPermissions | undefined
): ResolvedProviderPermissions {
  return {
    actions: permissions?.actions ?? [],
    managedPolicyArns: permissions?.managedPolicyArns ?? [],
  };
}

/**
 * Resolves IAM provider permissions for a data stream.
 * manifest first, matrix fallback for packages not yet upgraded.
 */
export function resolveProviderPermissions(
  serviceId: string,
  options: ResolveProviderPermissionsOptions = {}
): ResolvedProviderPermissions {
  const entry = SERVICE_MAP.get(serviceId);

  // Future: read provider_permissions from installed package manifest when available.
  if (options.manifestPermissions) {
    const fromManifest = normalizePermissions(options.manifestPermissions);
    if (fromManifest.actions.length > 0 || fromManifest.managedPolicyArns.length > 0) {
      return fromManifest;
    }
  }

  if (!entry?.providerPermissions) {
    return { actions: [], managedPolicyArns: [] };
  }

  return normalizePermissions(entry.providerPermissions);
}
