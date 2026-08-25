/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';

import type { NewPackagePolicy, PackagePolicy } from '..';

export function copyPackagePolicy(packagePolicy: PackagePolicy): NewPackagePolicy {
  return {
    ...omit(packagePolicy, 'id', 'version'), // Delete id to force new id creation
    name: 'copy-' + packagePolicy.name,
    inputs: packagePolicy.inputs?.map((input) => ({
      ...omit(input, 'id'),
      streams: input.streams?.map((stream) => ({
        ...omit(stream, 'id'),
      })),
    })),
  };
}
