/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistrySearchResult } from '../../../types';
import type { Installable } from '../../../types';

/**
 * Temporary denylist of packages known to be non-FIPS-compatible but whose manifests
 * do not carry `fips_compatible: false`. Remove entries once the manifest flag is in place.
 *
 * Tracked in: https://github.com/elastic/ingest-dev/issues/9559
 */
export const FIPS_INCOMPATIBLE_PACKAGES = new Set(['endpoint']);

/**
 * A package is FIPS incompatible when it has policy templates and all of them
 * are explicitly marked `fips_compatible: false`. A missing flag means compatible.
 */
export function isPackageFipsIncompatible(
  policyTemplates?: Array<{ fips_compatible?: boolean }>
): boolean {
  return (
    !!policyTemplates &&
    policyTemplates.length > 0 &&
    policyTemplates.every((template) => template.fips_compatible === false)
  );
}

/**
 * In FIPS mode, filter out packages that are known non-FIPS (via hardcoded denylist)
 * or whose policy templates all have `fips_compatible: false`.
 * A missing flag is treated as compatible (per package-spec default of true).
 * If all templates of a package are non-FIPS, the package is dropped entirely.
 * Packages with no templates at all are kept (unless on the denylist).
 */
export function filterOutNonFipsPolicyTemplates<T extends RegistrySearchResult>(
  packageList: Array<Installable<T>>
): Array<Installable<T>> {
  return packageList.reduce((acc, pkg) => {
    if (FIPS_INCOMPATIBLE_PACKAGES.has(pkg.name)) {
      return acc;
    }

    const { policy_templates: policyTemplates } = pkg;

    if (!policyTemplates || policyTemplates.length === 0) {
      acc.push(pkg);
      return acc;
    }

    if (isPackageFipsIncompatible(policyTemplates)) {
      return acc;
    }

    acc.push({
      ...pkg,
      policy_templates: policyTemplates.filter((template) => template.fips_compatible !== false),
    });
    return acc;
  }, [] as Array<Installable<T>>);
}
