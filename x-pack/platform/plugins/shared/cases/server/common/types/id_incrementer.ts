/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-server';
import { CaseIdIncrementerAttributesRt } from '../../../common/types/domain/incremental_id/latest';

export interface CaseIdIncrementerPersistedAttributes {
  '@timestamp': number;
  last_id: number;
  updated_at: number;
}

export type CaseIdIncrementerTransformedAttributes = CaseIdIncrementerPersistedAttributes;

export const CaseIdIncrementerTransformedAttributesRt = CaseIdIncrementerAttributesRt;

export type CaseIdIncrementerSavedObject = SavedObject<CaseIdIncrementerPersistedAttributes>;
