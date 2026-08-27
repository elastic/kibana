/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const createArtifactId = (type: string): string =>
  `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** Returns `existingId` when it holds a real value, otherwise a fresh id. */
export const resolveArtifactId = (type: string, existingId?: string): string =>
  existingId?.trim() ? existingId : createArtifactId(type);
