/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AccessForbidden = Symbol('AccessForbidden');
export const IndexNotFound = Symbol('IndexNotFound');
export const ReindexTaskFailed = Symbol('ReindexTaskFailed');
export const ReindexAlreadyInProgress = Symbol('ReindexAlreadyInProgress');
export const ReindexCannotBeCancelled = Symbol('ReindexCannotBeCancelled');
export const MetadataCannotBeGrabbed = Symbol('MetadataCannotBeGrabbed');
