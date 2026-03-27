/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedDrilldowns } from '@kbn/embeddable-plugin/server';
import type { SerializedTitles } from '@kbn/presentation-publishing';
import type { LensSerializedState } from '@kbn/lens-common';
import { stripUndefined } from '@kbn/lens-embeddable-utils/config_builder/transforms/charts/utils';

/**
 * Keys that should be persisted at the panel level.
 * All other properties from LensSerializedState are inherited from the
 * dashboard/container or are runtime-only and should not be persisted.
 *
 * TODO - LensSerializedState should really be paired down to match this list.
 * it is currently used as a runtime state object but it shouldn't be.
 */
type IncludedPanelStateKeys =
  | 'ref_id'
  | 'attributes'
  | 'references'
  | 'time_range'
  | keyof SerializedTitles
  | keyof SerializedDrilldowns;

export type StrippedLensState = Pick<LensSerializedState, IncludedPanelStateKeys>;

/**
 * The serialized state contains many properties that are inherited from the dashboard or other container
 * or are runtime-only (like executionContext) and should not be persisted at the panel
 * level. This function strips those out to ensure only panel-level state is persisted.
 */
export function stripInheritedContext(state: LensSerializedState): StrippedLensState {
  const {
    ref_id,
    attributes,
    // LensWithReferences
    references,
    // LensUnifiedSearchContext (only time_range is panel-level)
    time_range,
    // SerializedTitles
    title,
    description,
    hide_title,
    hide_border,
    // SerializedDrilldowns
    drilldowns,
  } = state;

  return stripUndefined({
    ref_id,
    attributes,
    references,
    time_range,
    title,
    description,
    hide_title,
    hide_border,
    drilldowns,
  });
}
