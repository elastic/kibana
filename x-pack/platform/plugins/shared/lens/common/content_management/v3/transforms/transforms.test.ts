/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SeriesType, XYVisualizationState } from '@kbn/lens-common';
import type { LensAttributesV2 } from '../../v2';
import { transformToV2LensSavedObjectFromV3, transformToV3LensItemAttributes } from './transforms';
import type { LensSavedObjectV3 } from './types';

interface XYAttributesOptions {
  version?: 2 | 3;
  seriesTypes?: SeriesType[];
  areaFill?: XYVisualizationState['areaFill'];
}

const getXYAttributes = ({
  version = 2,
  seriesTypes = ['area'],
  areaFill,
}: XYAttributesOptions = {}) =>
  ({
    visualizationType: 'lnsXY',
    version,
    state: {
      visualization: {
        layers: [
          ...seriesTypes.map((seriesType) => ({ layerType: 'data', seriesType })),
          { layerType: 'referenceLine' },
        ],
        ...(areaFill ? { areaFill } : {}),
      },
    },
  } as unknown as LensAttributesV2);

const getAreaFill = (attributes: { state?: unknown }) =>
  (attributes.state as { visualization: XYVisualizationState }).visualization.areaFill;

describe('transformToV3LensItemAttributes', () => {
  it.each<[string, XYAttributesOptions, XYVisualizationState['areaFill']]>([
    ['pins unset areaFill to solid on area charts', { seriesTypes: ['area'] }, 'solid'],
    ['keeps an explicit areaFill', { areaFill: 'gradient' }, 'gradient'],
    ['leaves areaFill unset without area layers', { seriesTypes: ['bar', 'line'] }, undefined],
  ])('%s', (_, options, expectedAreaFill) => {
    const result = transformToV3LensItemAttributes(getXYAttributes(options));

    expect(result.version).toBe(3);
    expect(getAreaFill(result)).toBe(expectedAreaFill);
  });

  it('leaves v3 charts untouched', () => {
    const attributes = getXYAttributes({ version: 3 });

    expect(transformToV3LensItemAttributes(attributes)).toBe(attributes);
  });

  it('only bumps the version of non-XY charts', () => {
    const attributes = { ...getXYAttributes(), visualizationType: 'lnsMetric' } as LensAttributesV2;

    expect(transformToV3LensItemAttributes(attributes)).toEqual({ ...attributes, version: 3 });
  });
});

describe('transformToV2LensSavedObjectFromV3', () => {
  const getSavedObject = (options: XYAttributesOptions = {}) =>
    ({
      id: 'lens-1',
      type: 'lens',
      attributes: getXYAttributes({ version: 3, ...options }),
    } as unknown as LensSavedObjectV3);

  it.each<[string, XYAttributesOptions, XYVisualizationState['areaFill']]>([
    ['pins unset areaFill to gradient on area charts', {}, 'gradient'],
    ['keeps an explicit areaFill', { areaFill: 'solid' }, 'solid'],
    ['leaves areaFill unset without area layers', { seriesTypes: ['bar', 'line'] }, undefined],
  ])('%s', (_, options, expectedAreaFill) => {
    const result = transformToV2LensSavedObjectFromV3(getSavedObject(options));

    expect(result.attributes.version).toBe(2);
    expect(getAreaFill(result.attributes)).toBe(expectedAreaFill);
  });

  it('leaves v2 saved objects untouched', () => {
    const savedObject = getSavedObject({ version: 2 });

    expect(transformToV2LensSavedObjectFromV3(savedObject)).toBe(savedObject);
  });
});
