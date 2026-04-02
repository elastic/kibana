/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LensByValueSerializedState,
  LensConfigBuilder,
  MetricVisualizationState,
} from '@kbn/lens-common';
import { LENS_ITEM_VERSION_V3 } from '@kbn/lens-common/content_management/constants';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';

import type { LensAttributesV1 } from '../content_management/v1';
import type { LensAttributesV2 } from '../content_management/v2';
import { getTransformOut } from './transform_out';

const builder = { isEnabled: false } as unknown as LensConfigBuilder;
const transformDrilldownsOut = ((state) => state) as DrilldownTransforms['transformOut'];

const createMetricVisualization = (): MetricVisualizationState => ({
  layerId: 'layer-1',
  layerType: 'data',
  titleWeight: 'bold',
});

const createState = (
  attributes: LensAttributesV1 | LensAttributesV2
): LensByValueSerializedState => ({
  attributes: {
    ...attributes,
    references: [],
  },
});

describe('getTransformOut', () => {
  it('migrates v1 metric attributes to v3 and removes titleWeight', () => {
    const transformOut = getTransformOut(builder, transformDrilldownsOut, true);

    const result = transformOut(
      createState({
        title: 'Metric',
        description: 'test',
        version: 1,
        visualizationType: 'lnsMetric',
        state: {
          visualization: createMetricVisualization(),
        },
      }),
      []
    );

    expect(result.attributes?.version).toBe(LENS_ITEM_VERSION_V3);
    expect(result.attributes?.state?.visualization).toEqual({
      layerId: 'layer-1',
      layerType: 'data',
    });
  });

  it('migrates v2 metric attributes to v3 and removes titleWeight', () => {
    const transformOut = getTransformOut(builder, transformDrilldownsOut, true);

    const result = transformOut(
      createState({
        title: 'Metric',
        description: 'test',
        version: 2,
        visualizationType: 'lnsMetric',
        state: {
          visualization: createMetricVisualization(),
        },
      }),
      []
    );

    expect(result.attributes?.version).toBe(LENS_ITEM_VERSION_V3);
    expect(result.attributes?.state?.visualization).toEqual({
      layerId: 'layer-1',
      layerType: 'data',
    });
  });
});
