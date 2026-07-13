/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { IMergeService } from './merge_service';
export { MergeService } from './merge_service';
export { MergeError } from './errors';
export { computeAffectedCount, findAffectedObjects, rewriteTagReferences } from './queries';
