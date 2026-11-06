/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { MAX_CHART_ANNOTATIONS } from '@kbn/custom-app-common';
import type { SourceData } from '../data/data_layer';

type Attributes = TypedLensByValueInput['attributes'];

const ANNOTATIONS_LAYER_ID = 'custom-app-annotations';
// What Lens names the reference to the data view of the layer of a chart's annotations.
const ANNOTATIONS_REFERENCE_NAME = `xy-visualization-layer-${ANNOTATIONS_LAYER_ID}`;

const toTimestamp = (value: unknown): string | undefined => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

/**
 * The Lens chart with moments marked on it, one vertical line for each row of the data, at the time
 * of the `time` column and named by the `label` column. They are drawn as the static annotations that
 * Lens keeps for charts of an ES|QL query. A chart that is not over time, or has no data view to hang
 * the layer on, is left as it is, and so is one whose rows have no times.
 */
export const addAnnotationsToChart = (
  attributes: Attributes,
  { columns, rows }: SourceData,
  { time, label }: { time: string; label?: string }
): Attributes => {
  const state = attributes.state as unknown as {
    visualization?: { layers?: unknown[] };
    adHocDataViews?: Record<string, unknown>;
    internalReferences?: Array<{ type: string; id: string; name: string }>;
  };
  const [dataViewId] = Object.keys(state.adHocDataViews ?? {});
  const timeIndex = columns.findIndex(({ name }) => name === time);
  const labelIndex = label === undefined ? -1 : columns.findIndex(({ name }) => name === label);
  if (
    attributes.visualizationType !== 'lnsXY' ||
    !Array.isArray(state.visualization?.layers) ||
    dataViewId === undefined ||
    timeIndex === -1
  ) {
    return attributes;
  }

  const annotations = rows.slice(0, MAX_CHART_ANNOTATIONS).flatMap((row, index) => {
    const timestamp = toTimestamp(row[timeIndex]);
    if (timestamp === undefined) return [];
    const text = labelIndex === -1 ? undefined : row[labelIndex];
    return [
      {
        id: `custom-app-annotation-${index}`,
        type: 'manual' as const,
        key: { type: 'point_in_time' as const, timestamp },
        label: text === null || text === undefined || text === '' ? timestamp : String(text),
        icon: 'triangle',
        lineWidth: 1,
        lineStyle: 'dashed',
      },
    ];
  });
  if (annotations.length === 0) return attributes;

  return {
    ...attributes,
    state: {
      ...attributes.state,
      internalReferences: [
        ...(state.internalReferences ?? []),
        { type: 'index-pattern', id: dataViewId, name: ANNOTATIONS_REFERENCE_NAME },
      ],
      visualization: {
        ...state.visualization,
        layers: [
          ...state.visualization.layers,
          {
            layerId: ANNOTATIONS_LAYER_ID,
            layerType: 'annotations',
            persistanceType: 'byValue',
            ignoreGlobalFilters: true,
            annotations,
          },
        ],
      },
    },
  } as Attributes;
};
