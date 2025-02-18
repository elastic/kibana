/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import { CASE_SAVED_OBJECT } from '../../common/constants';
import { CASE_REF_NAME } from './constants';

export const getCaseReferenceId = (references: SavedObjectReference[]): string | undefined => {
  return findReferenceId(CASE_REF_NAME, CASE_SAVED_OBJECT, references);
};

export const findReferenceId = (
  name: string,
  type: string,
  references?: SavedObjectReference[]
): string | undefined => {
  return references?.find((ref) => ref.name === name && ref.type === type)?.id;
};
