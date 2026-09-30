/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistrySearchResult } from '../../../types';
import type { Installable } from '../../../types';

/**
 * In FIPS mode, filter policy templates that have `fips_compatible: false`.
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

    const fipsCompatibleTemplates = policyTemplates.filter(
      (template) => template.fips_compatible !== false
    );

    if (fipsCompatibleTemplates.length === 0) {
      return acc;
    }

    acc.push({ ...pkg, policy_templates: fipsCompatibleTemplates });
    return acc;
  }, [] as Array<Installable<T>>);
}
