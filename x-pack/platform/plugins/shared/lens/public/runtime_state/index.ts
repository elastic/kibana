/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasourceStates, IndexPatternMap } from '@kbn/lens-common';
import { hydrateMetricTrendlineLayer } from './converters/metric_trendline';

export * from './converters/raw_color_mappings';

/**
 * A hydration function that fills in datasource state that cannot be computed
 * during the static API→LensState transform because it requires runtime
 * information (e.g. the DataView's actual time field).
 *
 * Each hydrator must be idempotent: if the state is already complete it should
 * return the original `datasourceStates` reference unchanged.
 */
export type StateHydrator = (
  visualizationType: string | null | undefined,
  visualizationState: unknown,
  datasourceStates: DatasourceStates,
  indexPatterns: IndexPatternMap
) => DatasourceStates;

/**
 * Registry of all state hydrators. Add new ones here — `hydrateState` will
 * run them in order without requiring any changes to call sites.
 */
const hydrators: StateHydrator[] = [hydrateMetricTrendlineLayer];

/**
 * Runs all registered hydrators in sequence, each receiving the output of the
 * previous one. Call this after `initializeDatasources()` in both the editor
 * (`initializeSources`) and embeddable (`persistedStateToExpression`) paths.
 */
export const hydrateState = (
  visualizationType: string | null | undefined,
  visualizationState: unknown,
  datasourceStates: DatasourceStates,
  indexPatterns: IndexPatternMap
): DatasourceStates =>
  hydrators.reduce(
    (states, hydrate) => hydrate(visualizationType, visualizationState, states, indexPatterns),
    datasourceStates
  );
