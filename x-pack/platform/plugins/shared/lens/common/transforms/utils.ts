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
  LensByValueFlattenedSerializedAPIConfig,
  LensByValueSerializedAPIConfig,
  LensSerializedAPIConfig,
  LensWireAPIConfig,
} from '@kbn/lens-common-2';

import { isLensAPIFormat } from '@kbn/lens-embeddable-utils';
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

export function isFlattenedAPIConfig(
  config:
    | FlattenedLensByValuePanelSchema
    | LensWireAPIConfig
    | LensSerializedAPIConfig
    | LensByValueSerializedState
): config is FlattenedLensByValuePanelSchema | LensByValueFlattenedSerializedAPIConfig {
  return (
    typeof config === 'object' && config !== null && 'type' in config && !('attributes' in config)
  );
}

export function unflattenAPIConfig(
  config: FlattenedLensByValuePanelSchema | LensByValueFlattenedSerializedAPIConfig
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
 * Counterpart of {@link unflattenAPIConfig}: moves chart fields from nested `attributes`
 * to the root, producing the flat dashboard app wire shape used with `lens.apiFormat`.
 *
 * Chart-level `title`/`description` are stripped because the panel-level ones
 * (already at the root) are the source of truth. This makes the operation lossy:
 * `unflatten(flatten(x))` may differ from `x` when the chart carried its own title/description.
 *
 * Returns the input unchanged for by-ref configs or when `attributes` is not in API format.
 */
export function flattenAPIConfig(config: LensSerializedAPIConfig): LensWireAPIConfig {
  if (!('attributes' in config) || !config.attributes || !isLensAPIFormat(config.attributes)) {
    return config;
  }
  const { title: _title, description: _description, ...chartFields } = config.attributes;
  const { attributes: _attributes, ...panelState } = config;
  return {
    ...panelState,
    ...chartFields,
  } satisfies LensByValueFlattenedSerializedAPIConfig;
}
