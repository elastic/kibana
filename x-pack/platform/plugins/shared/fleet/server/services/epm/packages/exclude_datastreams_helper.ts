/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Installable } from '../../../types';

export function shouldIncludePackageWithDatastreamTypes(
  pkg: Installable<any>,
  excludeDataStreamTypes: string[] = []
) {
  const shouldInclude =
    (pkg.data_streams || [])?.length === 0 ||
    pkg.data_streams?.some((dataStream: any) => {
      return !excludeDataStreamTypes.includes(dataStream.type);
    });

  return shouldInclude;
}
