/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { registerMergePreviewRoute } from './preview';
export { registerMergePreviewObjectsRoute } from './preview_objects';
export { registerMergeStartRoute } from './start';
export { registerMergeStatusRoute } from './status';
export { registerMergeCancelRoute } from './cancel';
export type { MergeRouteDeps, MergeRouteStartDeps } from './types';
