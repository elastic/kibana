/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Minimal structural view of the kbn-scout Fleet `integration` API surface these
 * helpers depend on, so callers can pass `apiServices.fleet.integration` without
 * a deep import of the (non-exported) fixture type.
 */
export interface FleetIntegrationApi {
  installPackage: (name: string, version: string, opts?: { force?: boolean }) => Promise<unknown>;
  getPackage: (name: string) => Promise<{ data?: { item?: { status?: string } } }>;
  delete: (name: string) => Promise<unknown>;
}

const isPackageInstalled = async (
  integration: FleetIntegrationApi,
  name: string
): Promise<boolean> => {
  try {
    const response = await integration.getPackage(name);
    return response?.data?.item?.status === 'installed';
  } catch {
    // A missing package resolves to "not installed" for our purposes.
    return false;
  }
};

/**
 * Installs a Fleet package only if it is not already present on the (shared) stack,
 * and returns a cleanup function that uninstalls it only when this call installed it.
 * This avoids clobbering or removing a package another suite (or the environment)
 * already depends on. Call the returned function in `afterAll`.
 */
export const ensurePackageInstalled = async (
  integration: FleetIntegrationApi,
  name: string,
  version: string
): Promise<() => Promise<void>> => {
  const wasInstalled = await isPackageInstalled(integration, name);

  if (!wasInstalled) {
    await integration.installPackage(name, version);
  }

  return async () => {
    // Only remove what we added; leave pre-existing installs untouched.
    if (!wasInstalled) {
      await integration.delete(name);
    }
  };
};
