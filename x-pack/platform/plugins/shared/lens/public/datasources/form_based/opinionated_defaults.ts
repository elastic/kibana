/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LENS_DATASOURCE_ID,
  type FormBasedPrivateState,
  type LensDocument,
} from '@kbn/lens-common';
import {
  applyEmptyRowsDefaultsOnTypeSwitch,
  applyEmptyRowsDefaultsToSuggestionState,
} from './include_empty_rows_defaults';

interface BaseContext {
  /** Datasource that owns the state being adjusted. */
  datasourceId?: string;
  /** Datasource state to adjust. */
  datasourceState: unknown;
  /** Visualization type id (subtype where applicable) being switched to. */
  targetVisualizationTypeId: string | undefined;
}

/**
 * A field drop produces a suggestion that may contain freshly created columns.
 * Opinionated defaults apply to those new columns only.
 */
export interface SuggestionDropContext extends BaseContext {
  kind: 'suggestion';
  /** Datasource state before the drop, used to detect newly created columns. */
  previousDatasourceState: unknown;
}

/**
 * A chart-type / series-type switch keeps existing columns. Opinionated
 * defaults reconcile carried-over values against the saved object.
 */
export interface TypeSwitchContext extends BaseContext {
  kind: 'typeSwitch';
  /** Loaded saved object, the baseline for "what did the user persist". */
  persistedDoc: LensDocument | undefined;
}

export type OpinionatedDefaultsContext = SuggestionDropContext | TypeSwitchContext;

/**
 * Applies every datasource-owned opinionated default that should react to a
 * visualization switch (field drop, chart type, series type, or layer).
 *
 * This is the single seam shared by all switch entry points: introducing a new
 * opinionated default means extending this function rather than touching each
 * call site. Non form-based datasources are returned untouched.
 */
export function applyOpinionatedDatasourceDefaults(context: OpinionatedDefaultsContext): unknown {
  const { datasourceId, datasourceState, targetVisualizationTypeId } = context;

  if (datasourceId !== LENS_DATASOURCE_ID.FORM_BASED || !datasourceState) {
    return datasourceState;
  }

  const state = datasourceState as FormBasedPrivateState;

  if (context.kind === 'suggestion') {
    return applyEmptyRowsDefaultsToSuggestionState(
      state,
      context.previousDatasourceState as FormBasedPrivateState | undefined,
      targetVisualizationTypeId
    );
  }

  return applyEmptyRowsDefaultsOnTypeSwitch(state, context.persistedDoc, targetVisualizationTypeId);
}
