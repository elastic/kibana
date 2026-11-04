/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LensApiConfig,
  MetricConfigESQL,
  XYConfigESQL,
  XYLayer,
} from '@kbn/lens-embeddable-utils';

/** A Lens chart, as Lens's API format describes it. */
export type { LensApiConfig };

/** An ES|QL metric chart. */
export type LensMetricConfig = MetricConfigESQL;

/** An ES|QL xy chart. */
export type LensXyConfig = XYConfigESQL;

export type LensXyLayer = XYConfigESQL['layers'][number];

export type LensXyDataLayer = Exclude<
  Extract<XYLayer, { data_source: { type: 'esql' } }>,
  { type: 'reference_lines' }
>;

export type LensXyEsqlReferenceLinesLayer = Extract<
  XYLayer,
  { type: 'reference_lines'; data_source: { type: 'esql' } }
>;

export type LensXyAnnotationsLayer = Extract<LensXyLayer, { type: 'annotations' }>;

/** A column's value format in Lens's API format. */
export type LensApiFormat = NonNullable<MetricConfigESQL['metrics'][number]['format']>;

/** A color mapping in Lens's API format. */
export type LensApiColorMapping = NonNullable<
  NonNullable<LensXyDataLayer['breakdown_by']>['color']
>;

/** Where a by-reference Lens chart came from, for the link back to it. */
export interface LensSavedObjectReference {
  id: string;
  /** The Lens editor's path for the saved object, in its space, without a time range. */
  path: string;
}

/** What the Lens materializer maps: the chart, and the saved object when it was loaded. */
export interface LensMaterializeConfig {
  chart: LensApiConfig;
  savedObject?: LensSavedObjectReference;
}
