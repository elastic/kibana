/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  ResolutionClient,
  type LinkResult,
  type CascadeResult,
  type UnlinkResult,
  type ResolutionGroup,
} from './resolution_client';
export { NAMESPACE_PRIORITY, selectTarget, type TargetSelectionEntity } from './target_selection';
