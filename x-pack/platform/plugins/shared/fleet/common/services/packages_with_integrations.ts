/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PackageInfo, PackageListItem } from '../types';

/**
 * Checks if a package has nested integrations by checking if it has more than one policy template.
 * @param pkgInfo - The package information.
 * @returns True if the package has nested integrations, false otherwise.
 */
export const doesPackageHaveIntegrations = (pkgInfo: PackageInfo | PackageListItem) => {
  return (pkgInfo.policy_templates || []).length > 1;
};
