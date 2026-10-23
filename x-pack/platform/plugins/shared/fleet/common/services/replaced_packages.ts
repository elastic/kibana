/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: a package version whose manifest says `deprecated.replaced_by.package` is replaced:
// browse hides it, and Fleet moves its integration policies to the replacement on upgrade.

import type { DeprecationInfo } from '../types';

/** The package that replaces this one, from `deprecated.replaced_by.package`. */
export const getReplacementPackageName = (pkg: { deprecated?: DeprecationInfo }) =>
  pkg.deprecated?.replaced_by?.package;
