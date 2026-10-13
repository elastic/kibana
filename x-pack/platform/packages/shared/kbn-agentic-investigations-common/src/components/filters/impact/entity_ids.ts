/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Investigation } from '../../../types';

/** The slice of a queue row the Impact pills and filter read. */
export type ImpactFilterable = Pick<Investigation, 'entityIds' | 'affectedSurface'>;

/** Entity ids the Impact pills and filter operate on. */
export const investigationEntityIds = (item: ImpactFilterable): string[] => {
  if (item.entityIds && item.entityIds.length > 0) {
    return item.entityIds;
  }
  const surface = item.affectedSurface?.trim();
  return surface ? [surface] : [];
};
