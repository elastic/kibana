/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SeriesType, XYVisualizationState } from '@kbn/lens-common';
import type { LensAttributesV2 } from '../../v2';
import { transformToV3LensItemAttributes } from './transforms';

const getXYAttributes = ({
  version = 2,
  seriesTypes = ['area'],
  areaFill,
}: {
  version?: 2 | 3;
  seriesTypes?: SeriesType[];
  areaFill?: XYVisualizationState['areaFill'];
} = {}) =>
  ({
    title: 'XY chart',
    visualizationType: 'lnsXY',
    version,
    references: [],
    state: {
      datasourceStates: {},
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: {
        legend: { isVisible: true, position: 'bottom' },
        preferredSeriesType: seriesTypes[0],
        layers: [
          ...seriesTypes.map((seriesType, i) => ({
            layerId: `layer-${i}`,
            layerType: 'data',
            seriesType,
            accessors: ['y'],
            xAccessor: 'x',
          })),
          {
            layerId: 'reference-layer',
            layerType: 'referenceLine',
            accessors: ['ref'],
          },
        ],
        ...(areaFill ? { areaFill } : {}),
      },
    },
  } as unknown as LensAttributesV2);

const getAreaFill = (attributes: { state?: unknown }) =>
  (attributes.state as { visualization: XYVisualizationState }).visualization.areaFill;

describe('transformToV3LensItemAttributes', () => {
  it.each<SeriesType>(['area', 'area_stacked', 'area_percentage_stacked'])(
    'sets an unset areaFill to solid on v2 %s charts',
    (seriesType) => {
      const result = transformToV3LensItemAttributes(
        getXYAttributes({ seriesTypes: [seriesType] })
      );

      expect(result.version).toBe(3);
      expect(getAreaFill(result)).toBe('solid');
    }
  );

  it('sets solid when only one of the layers is an area', () => {
    const result = transformToV3LensItemAttributes(
      getXYAttributes({ seriesTypes: ['bar', 'area'] })
    );

    expect(getAreaFill(result)).toBe('solid');
  });

  it.each(['solid', 'gradient'] as const)('keeps an explicit %s areaFill on v2 charts', (fill) => {
    const result = transformToV3LensItemAttributes(getXYAttributes({ areaFill: fill }));

    expect(result.version).toBe(3);
    expect(getAreaFill(result)).toBe(fill);
  });

  it('does not set areaFill on v2 charts without area layers', () => {
    const result = transformToV3LensItemAttributes(
      getXYAttributes({ seriesTypes: ['bar', 'line'] })
    );

    expect(result.version).toBe(3);
    expect(getAreaFill(result)).toBeUndefined();
  });

  it('leaves v3 charts untouched', () => {
    const attributes = getXYAttributes({ version: 3 });
    const result = transformToV3LensItemAttributes(attributes);

    expect(result).toBe(attributes);
    expect(getAreaFill(result)).toBeUndefined();
  });

  it('in non-XY charts, only bumps the version', () => {
    const attributes = {
      ...getXYAttributes(),
      visualizationType: 'lnsMetric',
    } as LensAttributesV2;
    const result = transformToV3LensItemAttributes(attributes);

    expect(result).toEqual({ ...attributes, version: 3 });
  });
});
