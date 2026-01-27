/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { resolveResource, type ResolveResourceResponse } from './resolve_resource';
export {
  resolveResourceWithSamplingStats,
  type ResolvedResourceWithSampling,
} from './resolve_resource_with_sampling_stats';
export { formatResourceWithSampledValues } from './format_resource_with_sampling';
