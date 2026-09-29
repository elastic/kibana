/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Investigation } from '../../../types';

/** Entity ids the Impact pills and filter operate on. */
export const investigationEntityIds = (investigation: Investigation): string[] => {
  if (investigation.entityIds && investigation.entityIds.length > 0) {
    return investigation.entityIds;
  }
  const surface = investigation.affectedSurface?.trim();
  return surface ? [surface] : [];
};
