/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistrySearchResult } from '../../../types';
import type { Installable } from '../../../types';

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
 * In FIPS mode, filter out the policy templates that have `fips_compatible: false`.
 * A missing flag is treated as compatible (per package-spec default of true).
 * If all templates of a package are non-FIPS, the package is dropped entirely.
 * Packages with no templates at all are kept.
 */
export function filterOutNonFipsPolicyTemplates<T extends RegistrySearchResult>(
  packageList: Array<Installable<T>>
): Array<Installable<T>> {
  return packageList.reduce((acc, pkg) => {
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
