/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteConfigOptions, RouteMethod } from '@kbn/core-http-server';
import mergeWith from 'lodash/mergeWith';

export function deepMergeRouteOptions(
  base: RouteConfigOptions<RouteMethod>,
  overrides: RouteConfigOptions<RouteMethod>
): RouteConfigOptions<RouteMethod> {
  return mergeWith({}, base, overrides, (baseVal: unknown, overrideVal: unknown) => {
    if (Array.isArray(baseVal) && Array.isArray(overrideVal)) {
      return [...baseVal, ...overrideVal];
    }
    return undefined;
  });
}
