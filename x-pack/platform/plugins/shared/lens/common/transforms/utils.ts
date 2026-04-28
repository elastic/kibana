/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';

import type { LensByRefSerializedState, LensSerializedState } from '@kbn/lens-common';
import type {
  LensByRefSerializedAPIConfig,
  LensByValueFlattenedSerializedAPIConfig,
  LensByValueSerializedAPIConfig,
  LensSerializedAPIConfig,
} from '@kbn/lens-common-2';

import type { LensApiConfig } from '@kbn/lens-embeddable-utils';
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
  config:
    | LensByRefSerializedAPIConfig
    | LensSerializedAPIConfig
    | LensByValueFlattenedSerializedAPIConfig
    | FlattenedLensByValuePanelSchema
): config is LensByRefSerializedAPIConfig {
  return 'ref_id' in config && !!config.ref_id;
}

export function isFlattenedAPIConfig(config: unknown): config is FlattenedLensByValuePanelSchema {
  return (
    typeof config === 'object' && config !== null && 'type' in config && !('attributes' in config)
  );
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

/**
 * Inverse of {@link unflattenAPIConfig}: merges nested `attributes` (Lens API chart shape)
 * into the root object for dashboard app wire format when `lens.apiFormat` is enabled.
 *
 * Panel-level `title`/`description` take precedence over chart-level ones
 */
export function flattenApiConfig(
  config: LensByValueSerializedAPIConfig
): LensByValueFlattenedSerializedAPIConfig {
  const { attributes, ...panelState } = config;
  const { title: _title, description: _description, ...chartFields } = attributes as LensApiConfig;

  return {
    ...panelState,
    ...chartFields,
  } satisfies LensByValueFlattenedSerializedAPIConfig;
}
