/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';

import type {
  LensByRefSerializedState,
  LensByValueSerializedState,
  LensSerializedState,
} from '@kbn/lens-common';
import type {
  LensByRefSerializedAPIConfig,
  LensByValueSerializedAPIConfig,
  LensSerializedAPIConfig,
} from '@kbn/lens-common-2';

import type { FlattenedLensByValuePanelSchema } from '../../server/types';
import { DOC_TYPE } from '../constants';

export const LENS_SAVED_OBJECT_REF_NAME = 'savedObjectRef';

export function findLensReference(references?: Reference[]) {
  return references
    ? references.find((ref) => ref.type === DOC_TYPE && ref.name === LENS_SAVED_OBJECT_REF_NAME)
    : undefined;
}

export function isByRefLensState(state: LensSerializedState): state is LensByRefSerializedState {
  return 'ref_id' in state && !!state.ref_id;
}

export function isByRefLensConfig(
  config: LensByRefSerializedAPIConfig | LensSerializedAPIConfig | FlattenedLensByValuePanelSchema
): config is LensByRefSerializedAPIConfig {
  return 'ref_id' in config && !!config.ref_id;
}

export function isFlattenedAPIConfig(
  config: LensSerializedAPIConfig | FlattenedLensByValuePanelSchema | LensByValueSerializedState
): config is FlattenedLensByValuePanelSchema {
  return !('attributes' in config);
}

export function unflattenAPIConfig(
  config: FlattenedLensByValuePanelSchema
): LensByValueSerializedAPIConfig {
  const { title, description, hide_title, hide_border, time_range, drilldowns, ...attributes } =
    config;

  return {
    title,
    description,
    hide_title,
    hide_border,
    time_range,
    drilldowns,
    attributes,
  };
}
