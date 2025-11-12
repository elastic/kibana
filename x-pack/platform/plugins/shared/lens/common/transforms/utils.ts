/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';

import type { LensByRefSerializedState, LensSerializedState } from '@kbn/lens-common';
import { DOC_TYPE } from '../constants';

export const LENS_SAVED_OBJECT_REF_NAME = 'savedObjectRef';

export function findLensReference(references?: Reference[]) {
  return references
    ? references.find((ref) => ref.type === DOC_TYPE && ref.name === LENS_SAVED_OBJECT_REF_NAME)
    : undefined;
}

export function isByRefLensState(state: LensSerializedState): state is LensByRefSerializedState {
  return !state.attributes;
}
