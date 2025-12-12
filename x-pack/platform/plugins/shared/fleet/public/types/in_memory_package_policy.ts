/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy } from '../../common/types';

// Used in list view tables where virtual/flattened fields are added
export interface InMemoryPackagePolicy extends PackagePolicy {
  packageName?: string;
  packageTitle?: string;
  packageVersion?: string;
  type?: string;
  hasUpgrade: boolean;
}
